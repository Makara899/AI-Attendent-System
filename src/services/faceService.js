import * as faceapi from '@vladmandic/face-api';

class FaceService {
  constructor() {
    this.modelsLoaded = false;
    this.loadingPromise = null;
    this.faceMatcher = null;
    this.studentsCache = [];
    this.modelPath = '/models';
  }

  // Load all required face-api AI neural network models
  async loadModels(onProgress = null) {
    if (this.modelsLoaded) {
      if (onProgress) onProgress('AI Models Ready', 100);
      return true;
    }
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        console.log('🔄 Loading AI Face Recognition Models from:', this.modelPath);
        if (onProgress) onProgress('Loading SSD MobileNet detector...', 20);

        // 1. SSD MobileNet v1 (High accuracy face detection)
        await faceapi.nets.ssdMobilenetv1.loadFromUri(this.modelPath);
        if (onProgress) onProgress('Loading Tiny Face detector...', 45);

        // 2. Tiny Face Detector (Faster lightweight detector)
        await faceapi.nets.tinyFaceDetector.loadFromUri(this.modelPath);
        if (onProgress) onProgress('Loading 68-point landmarks neural net...', 70);

        // 3. 68-Point Face Landmark Net
        await faceapi.nets.faceLandmark68Net.loadFromUri(this.modelPath);
        if (onProgress) onProgress('Loading 128D face recognition neural net...', 90);

        // 4. Face Recognition Net (Generates 128D biometric embedding)
        await faceapi.nets.faceRecognitionNet.loadFromUri(this.modelPath);

        this.modelsLoaded = true;
        console.log('✅ All Face Recognition Models Loaded Successfully!');
        if (onProgress) onProgress('AI Neural Engine ready', 100);
        return true;
      } catch (error) {
        console.error('❌ Failed to load Face-API models:', error);
        this.modelsLoaded = false;
        this.loadingPromise = null;
        throw error;
      }
    })();

    return this.loadingPromise;
  }

  getDetectorOptions(type = 'ssd', scoreThreshold = 0.5) {
    if (type === 'tiny') {
      return new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: scoreThreshold
      });
    }
    return new faceapi.SsdMobilenetv1Options({
      minConfidence: scoreThreshold
    });
  }

  // Detect single face and extract 128D descriptor from image or video
  async extractFaceDescriptor(inputElement, detectorType = 'ssd') {
    await this.loadModels();

    let detection = null;

    // Tier 1: SSD Mobilenet v1
    try {
      const ssdOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });
      detection = await faceapi
        .detectSingleFace(inputElement, ssdOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();
    } catch (e) {
      console.warn('SSD face detection attempt:', e);
    }

    // Tier 2: Tiny Face Detector with high resolution
    if (!detection) {
      try {
        const tinyOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.2 });
        detection = await faceapi
          .detectSingleFace(inputElement, tinyOptions)
          .withFaceLandmarks()
          .withFaceDescriptor();
      } catch (e) {
        console.warn('Tiny face fallback:', e);
      }
    }

    // Tier 3: All faces search (pick largest face)
    if (!detection) {
      try {
        const allDetections = await faceapi
          .detectAllFaces(inputElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.15 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (allDetections && allDetections.length > 0) {
          // Sort by box area descending
          allDetections.sort((a, b) => (b.detection.box.width * b.detection.box.height) - (a.detection.box.width * a.detection.box.height));
          detection = allDetections[0];
        }
      } catch (e) {
        console.warn('All-faces fallback:', e);
      }
    }

    if (!detection) {
      return { 
        success: false, 
        error: 'AI មិនអាចសម្គាល់មុខបានច្បាស់ទេ (No face detected). សូមថតចំមុខ និងមានពន្លឺគ្រប់គ្រាន់' 
      };
    }

    return {
      success: true,
      detection: detection.detection,
      landmarks: detection.landmarks,
      descriptor: Array.from(detection.descriptor) // 128-element float array
    };
  }

  // Build FaceMatcher from registered students
  buildFaceMatcher(students, maxDescriptorDistance = 0.58) {
    this.studentsCache = students || [];
    const labeledDescriptors = [];

    (students || []).forEach((student) => {
      if (!student.face_descriptor) return;

      try {
        let raw = student.face_descriptor;
        if (typeof raw === 'string') {
          try {
            raw = JSON.parse(raw);
          } catch(e) {
            console.warn('Descriptor JSON parse error for student:', student.student_id);
          }
        }

        let descriptorArray = null;

        if (Array.isArray(raw)) {
          if (Array.isArray(raw[0]) || raw[0] instanceof Float32Array) {
            descriptorArray = raw.map(d => new Float32Array(Object.values(d)));
          } else if (raw.length === 128) {
            descriptorArray = [new Float32Array(raw)];
          }
        } else if (raw && typeof raw === 'object') {
          if (raw.descriptor && Array.isArray(raw.descriptor)) {
            descriptorArray = [new Float32Array(raw.descriptor)];
          } else {
            const vals = Object.values(raw);
            if (vals.length === 128) {
              descriptorArray = [new Float32Array(vals)];
            }
          }
        }

        if (descriptorArray && descriptorArray.length > 0) {
          // Label format: "STUDENT_ID::DB_ID::FULL_NAME::CLASS"
          const label = `${student.student_id}::${student.id}::${student.full_name}::${student.class_name || ''}`;
          labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(label, descriptorArray));
        }
      } catch (e) {
        console.warn(`Error parsing face descriptor for student ${student.student_id}:`, e);
      }
    });

    if (labeledDescriptors.length > 0) {
      this.faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, maxDescriptorDistance);
      console.log(`🤖 FaceMatcher initialized with ${labeledDescriptors.length} enrolled students. Distance threshold: ${maxDescriptorDistance}`);
    } else {
      this.faceMatcher = null;
      console.log('ℹ️ No student face descriptors available for FaceMatcher.');
    }
  }

  // Detect all faces in video frame and match them against enrolled students
  async recognizeFacesInVideo(videoElement, detectorType = 'ssd', distanceThreshold = 0.58) {
    if (!this.modelsLoaded || !videoElement || videoElement.paused || videoElement.ended) {
      return [];
    }

    let detections = [];
    try {
      const options = detectorType === 'tiny'
        ? new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.20 })
        : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.22 });

      detections = await faceapi
        .detectAllFaces(videoElement, options)
        .withFaceLandmarks()
        .withFaceDescriptors();
    } catch(e) {
      console.warn('Face detection in video error:', e);
    }

    const results = [];

    for (const detection of detections) {
      let matchResult = null;
      let matchedStudent = null;
      let confidence = 0;
      let distance = 1.0;

      if (this.faceMatcher) {
        const bestMatch = this.faceMatcher.findBestMatch(detection.descriptor);
        distance = bestMatch.distance;
        // Confidence calculation: 1.0 at 0 distance, ~90% at 0.4, >75% at 0.58
        confidence = Math.max(0, Math.min(1, 1 - (distance / 0.75)));

        if (bestMatch.label !== 'unknown') {
          const parts = bestMatch.label.split('::');
          matchedStudent = {
            student_id: parts[0] || '',
            id: Number(parts[1]) || 0,
            full_name: parts[2] || 'Student',
            class_name: parts[3] || ''
          };
          matchResult = bestMatch;
        }
      }

      results.push({
        box: detection.detection.box,
        landmarks: detection.landmarks,
        descriptor: detection.descriptor,
        matchedStudent,
        distance,
        confidence,
        isRecognized: matchedStudent !== null && distance <= distanceThreshold
      });
    }

    return results;
  }

  // Draw bounding boxes, labels, and landmarks on Canvas
  drawRecognitionOverlay(canvas, videoElement, recognitionResults) {
    if (!canvas || !videoElement) return;

    const displaySize = {
      width: videoElement.videoWidth || videoElement.clientWidth,
      height: videoElement.videoHeight || videoElement.clientHeight
    };

    faceapi.matchDimensions(canvas, displaySize);
    const resizedResults = faceapi.resizeResults(recognitionResults, displaySize);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    resizedResults.forEach(res => {
      const { box } = res;
      const { x, y, width, height } = box;

      const isMatch = res.isRecognized && res.matchedStudent;
      const primaryColor = isMatch ? '#10b981' : '#f59e0b'; // Green vs Amber/Orange
      const accentBg = isMatch ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)';

      // 1. Draw glowing modern bounding corner brackets
      ctx.lineWidth = 3;
      ctx.strokeStyle = primaryColor;
      ctx.fillStyle = accentBg;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 10;

      // Fill light transparent background in face box
      ctx.fillRect(x, y, width, height);

      // Corner bracket length
      const cornerLen = Math.min(width, height) * 0.22;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLen, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(x, y + height - cornerLen);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x + cornerLen, y + height);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLen, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + width, y + height - cornerLen);
      ctx.stroke();

      // Reset shadow for text
      ctx.shadowBlur = 0;

      // 2. Draw Top Tag Badge (Student Name & Match %)
      const textTitle = isMatch ? res.matchedStudent.full_name : 'Unknown Face';
      const confPercent = Math.round(res.confidence * 100);
      const textSub = isMatch
        ? `${res.matchedStudent.student_id} | ${confPercent}% Match`
        : `Unregistered (${confPercent}% conf)`;

      ctx.font = '600 13px Inter, sans-serif';
      const titleMetrics = ctx.measureText(textTitle);
      const badgeWidth = Math.max(width, titleMetrics.width + 30);
      const badgeHeight = 38;
      const badgeY = Math.max(10, y - badgeHeight - 6);

      // Rounded pill badge header
      ctx.fillStyle = isMatch ? 'rgba(6, 78, 59, 0.92)' : 'rgba(120, 53, 15, 0.92)';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(x, badgeY, badgeWidth, badgeHeight, 6);
      ctx.fill();
      ctx.stroke();

      // Title Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Inter, Kantumruy Pro, sans-serif';
      ctx.fillText(textTitle, x + 8, badgeY + 16);

      // Subtitle text (Confidence & ID)
      ctx.fillStyle = isMatch ? '#a7f3d0' : '#fde68a';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(textSub, x + 8, badgeY + 31);
    });
  }
}

export const faceService = new FaceService();
