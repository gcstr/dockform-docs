// Three.js Wave Background Animation
// Adapted from dot-pattern wave animation script

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION - Easy to tweak parameters
  // ============================================================================
  
  const CONFIG = {
    // Colors
    backgroundColor: '#000',
    colorGradient: {
      r: 0.0,  // Red component (0.0 - 1.0)
      g: 1.0,  // Green component (0.0 - 1.0) - creates gradient effect
      b: 1.0   // Blue component (0.0 - 1.0) - creates gradient effect
    },
    
    // Wave 1 parameters
    wave1: {
      frequency: 3.0,    // Noise frequency (higher = more waves)
      amplitude: 0.2,   // Wave height (higher = taller waves)
      speed: 0.5         // Animation speed multiplier
    },
    
    // Wave 2 parameters
    wave2: {
      frequency: 2.0,    // Noise frequency (higher = more waves)
      amplitude: 0.2,   // Wave height (higher = taller waves)
      speed: 0.8,       // Animation speed multiplier
      speedMultiplier: 0.6  // Additional speed modifier for opposite direction
    },
    
    // Visual settings
    pointSize: 2.5,      // Size of each point/dot
    planeSegments: 128,  // Number of segments for plane geometry (higher = smoother but slower)
    
    // Camera settings
    camera: {
      fov: 65,          // Field of view in degrees
      position: { x: -1.973, y: 0.299, z: 0.140 }
    }
  };

  // Shader code - WebGL requires shaders as GLSL source strings
  const vertexShader = `
    #define PI 3.14159265359

    uniform float u_time;
    uniform float u_pointsize;
    uniform float u_noise_amp_1;
    uniform float u_noise_freq_1;
    uniform float u_spd_modifier_1;
    uniform float u_noise_amp_2;
    uniform float u_noise_freq_2;
    uniform float u_spd_modifier_2;

    // 2D Random
    float random (in vec2 st) {
        return fract(sin(dot(st.xy,
                            vec2(12.9898,78.233)))
                    * 43758.5453123);
    }

    // 2D Noise based on Morgan McGuire @morgan3d
    // https://www.shadertoy.com/view/4dS3Wd
    float noise (in vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);

        // Four corners in 2D of a tile
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));

        // Smooth Interpolation
        // Cubic Hermine Curve.  Same as SmoothStep()
        vec2 u = f*f*(3.0-2.0*f);

        // Mix 4 coorners percentages
        return mix(a, b, u.x) +
                (c - a)* u.y * (1.0 - u.x) +
                (d - b) * u.x * u.y;
    }

    mat2 rotate2d(float angle){
        return mat2(cos(angle),-sin(angle),
                  sin(angle),cos(angle));
    }

    void main() {
      gl_PointSize = u_pointsize;

      vec3 pos = position;
      // pos.xy is the original 2D dimension of the plane coordinates
      pos.z += noise(pos.xy * u_noise_freq_1 + u_time * u_spd_modifier_1) * u_noise_amp_1;
      // add noise layering
      // minus u_time makes the second layer of wave goes the other direction
      pos.z += noise(rotate2d(PI / 4.) * pos.yx * u_noise_freq_2 - u_time * u_spd_modifier_2 * ${CONFIG.wave2.speedMultiplier}) * u_noise_amp_2;

      vec4 mvm = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvm;
    }
  `;

  const fragmentShader = `
    #ifdef GL_ES
    precision mediump float;
    #endif

    #define PI 3.14159265359
    #define TWO_PI 6.28318530718
    
    uniform vec2 u_resolution;

    uniform vec3 u_color;

    void main() {
      vec2 st = gl_FragCoord.xy/u_resolution.xy;
      // Original: vec3(0.0, st) creates gradient from black to cyan
      // Now using u_color to control the gradient colors
      gl_FragColor = vec4(u_color.r, u_color.g * st.x, u_color.b * st.y, 1.0);
    }
  `;

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const canvas = document.getElementById('waveCanvas');
    if (!canvas) {
      // Retry after a short delay if canvas isn't ready yet
      setTimeout(init, 100);
      return;
    }

    // Wait for Three.js to be available
    if (!window.THREE) {
      setTimeout(init, 50);
      return;
    }

    setupScene();
  }

  function setupScene() {
    const canvas = document.getElementById('waveCanvas');
    if (!canvas || !window.THREE) return;

    const THREE = window.THREE;

    // Uniforms for shader
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_pointsize: { value: CONFIG.pointSize },
      u_color: { value: new THREE.Vector3(CONFIG.colorGradient.r, CONFIG.colorGradient.g, CONFIG.colorGradient.b) },
      // wave 1
      u_noise_freq_1: { value: CONFIG.wave1.frequency },
      u_noise_amp_1: { value: CONFIG.wave1.amplitude },
      u_spd_modifier_1: { value: CONFIG.wave1.speed },
      // wave 2
      u_noise_freq_2: { value: CONFIG.wave2.frequency },
      u_noise_amp_2: { value: CONFIG.wave2.amplitude },
      u_spd_modifier_2: { value: CONFIG.wave2.speed }
    };

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.backgroundColor);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Create camera with fixed position
    const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.set(CONFIG.camera.position.x, CONFIG.camera.position.y, CONFIG.camera.position.z);
    camera.lookAt(0, 0, 0); // Always look at the center
    
    // Calculate distance from camera to center (where the plane is)
    const cameraDistance = camera.position.length();
    
    // Function to calculate plane size needed to fill viewport
    function calculatePlaneSize() {
      const aspect = window.innerWidth / window.innerHeight;
      const fov = camera.fov * (Math.PI / 180); // Convert to radians
      
      // Calculate visible height at the plane's distance
      const visibleHeight = 2 * Math.tan(fov / 2) * cameraDistance;
      const visibleWidth = visibleHeight * aspect;
      
      // Account for plane rotation (45 degrees) - need larger size to fill screen
      // Use larger multiplier to ensure coverage at all aspect ratios
      const padding = 2.5;
      return {
        width: Math.max(visibleWidth * padding, 10),
        height: Math.max(visibleHeight * padding, 10)
      };
    }

    // Create geometry and material with dynamic sizing
    let planeSize = calculatePlaneSize();
    let geometry = new THREE.PlaneGeometry(planeSize.width, planeSize.height, CONFIG.planeSegments, CONFIG.planeSegments);
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });

    const mesh = new THREE.Points(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    mesh.rotation.y = Math.PI / 4;
    scene.add(mesh);
    
    // Function to update plane size on resize
    function updatePlaneSize() {
      const newSize = calculatePlaneSize();
      
      // Dispose old geometry
      geometry.dispose();
      
      // Create new geometry with updated size
      geometry = new THREE.PlaneGeometry(newSize.width, newSize.height, CONFIG.planeSegments, CONFIG.planeSegments);
      mesh.geometry = geometry;
    }

    // Animation clock
    const clock = new THREE.Clock();

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      uniforms.u_time.value = elapsed;

      renderer.render(scene, camera);
    }

    // Handle window resize
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
      updatePlaneSize();
    }

    window.addEventListener('resize', onWindowResize);

    // Start animation
    animate();
  }
})();

