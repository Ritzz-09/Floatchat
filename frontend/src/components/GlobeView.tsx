import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Radio,
  Navigation,
  Activity,
  Layers
} from 'lucide-react';
import { ArgoFloat, SpatialGridPoint } from '../types';
import { playClickSound } from '../utils/audio';

interface GlobeViewProps {
  floats: ArgoFloat[];
  spatialGrid: SpatialGridPoint[];
  selectedFloat: ArgoFloat | null;
  onSelectFloat: (float: ArgoFloat | null) => void;
  activeVariable: string;
  depth: number;
  timePeriod: string;
  targetCoords?: { lat: number; lon: number; altitude?: number };
}

// Convert geographic coordinates to Cartesian vector on sphere
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90.0 - lat) * (Math.PI / 180.0);
  const theta = (lon + 180.0) * (Math.PI / 180.0);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Color conversion for smooth continuous scientific field based on active variable
function getFieldRgba(val: number, variable: string, alpha = 0.45): string {
  const v = variable.toLowerCase();
  if (v === 'salinity') {
    // Salinity: Turquoise to Emerald Green
    const norm = Math.max(0, Math.min(1, (val - 32.0) / 4.0));
    return `rgba(${Math.round(16 + 40 * norm)}, ${Math.round(185 + 50 * norm)}, ${Math.round(160 - 30 * norm)}, ${alpha})`;
  } else if (v === 'oxygen') {
    // Oxygen: Deep Purple to Radiant Fuchsia/Pink
    const norm = Math.max(0, Math.min(1, val / 220.0));
    return `rgba(${Math.round(180 + 55 * norm)}, ${Math.round(30 + 40 * norm)}, ${Math.round(200 + 40 * norm)}, ${alpha})`;
  } else if (v === 'chlorophyll') {
    // Chlorophyll: Ocean Blue to Vivid Lime Green
    const norm = Math.max(0, Math.min(1, val / 2.0));
    return `rgba(${Math.round(132 * norm)}, ${Math.round(204 * norm)}, ${Math.round(22 * norm)}, ${alpha})`;
  } else if (v === 'temperature') {
    // Temperature: Deep Navy (cold) to Fiery Orange/Red (warm)
    const norm = Math.max(0, Math.min(1, (val - 2.0) / 28.0));
    return `rgba(${Math.round(245 * norm + 20)}, ${Math.round(120 * norm + 30)}, ${Math.round(20 * (1 - norm))}, ${alpha})`;
  }
  // Default: Temperature Anomaly (-2°C Cool Blue -> 0°C Neutral -> +2°C Hot Crimson)
  if (val < -0.6) return `rgba(2, 132, 199, ${alpha})`;
  if (val < -0.1) return `rgba(56, 189, 248, ${alpha * 0.8})`;
  if (val < 0.3) return `rgba(148, 163, 184, ${alpha * 0.4})`;
  if (val < 1.0) return `rgba(245, 158, 11, ${alpha * 0.85})`;
  return `rgba(239, 68, 68, ${alpha * 0.95})`;
}

// Scientific land-mask check: verifies coordinates are strictly oceanic (never on land)
export function isOcean(lat: number, lon: number): boolean {
  // Northern landmass (Himalayas, Tibet, Eurasia)
  if (lat > 27.0 && lon > 65.0 && lon < 100.0) return false;
  
  // Indian Subcontinent triangular landmass:
  // South tip: (8.1°N, 77.5°E) -> North Gujarat (24°N, 69°E) / Bengal (22.5°N, 89°E)
  if (lat >= 8.0 && lat <= 26.5) {
    const westLon = 77.5 - (lat - 8.0) * ((77.5 - 68.8) / (24.0 - 8.0));
    const eastLon = 77.5 + (lat - 8.0) * ((89.0 - 77.5) / (22.5 - 8.0));
    if (lon >= westLon && lon <= eastLon) {
      return false; // On Indian mainland
    }
  }

  // Sri Lanka
  if (lat >= 5.8 && lat <= 9.9 && lon >= 79.4 && lon <= 82.0) return false;

  // Arabian Peninsula (Saudi, Oman, Yemen, UAE)
  if (lat >= 12.0 && lat <= 31.0 && lon >= 34.0 && lon <= 60.0) return false;

  // Southeast Asia mainland (Myanmar, Thailand, Malaysia)
  if (lat > 9.0 && lon > 98.2) return false;

  // Horn of Africa
  if (lat >= -5.0 && lat <= 12.0 && lon < 51.5) return false;

  return true;
}

// Circular luminous glow sprite for ocean current tracers
function createCurrentParticleTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(0, 242, 254, 1.0)');
  grad.addColorStop(0.35, 'rgba(6, 182, 212, 0.75)');
  grad.addColorStop(0.7, 'rgba(14, 165, 233, 0.2)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(16, 16, 16, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export const GlobeView: React.FC<GlobeViewProps> = ({
  floats,
  spatialGrid,
  selectedFloat,
  onSelectFloat,
  activeVariable,
  depth,
  timePeriod,
  targetCoords,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [hoveredFloat, setHoveredFloat] = useState<{
    float: ArgoFloat;
    x: number;
    y: number;
  } | null>(null);

  // HUD live telemetry
  const [hudCoords, setHudCoords] = useState({ lat: 14.2, lon: 88.5 });

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const floatsGroupRef = useRef<THREE.Group | null>(null);
  const trajectoriesGroupRef = useRef<THREE.Group | null>(null);
  const currentsGroupRef = useRef<THREE.Points | null>(null);
  const depthIsobarMeshRef = useRef<THREE.Mesh | null>(null);
  const anomalyMeshRef = useRef<THREE.Mesh | null>(null);
  const anomalyTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const anomalyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const earthPlaneMeshRef = useRef<THREE.Mesh | null>(null);
  const anomalyPlaneMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosOuterMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosInnerMeshRef = useRef<THREE.Mesh | null>(null);
  const viewModeRef = useRef<'3D' | '2D'>('3D');

  const EARTH_RADIUS = 100.0;

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 4000);
    camera.position.set(0, 50, 275);
    cameraRef.current = camera;

    // 3. High-Fidelity WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls with smooth damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 130;
    controls.maxDistance = 500;
    controls.autoRotate = isAutoRotating;
    controls.autoRotateSpeed = 0.7;
    controlsRef.current = controls;

    // 5. Main Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Load Photorealistic 4096x2048 Earth map
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/earth_dark.png', (tex) => {
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
    });

    const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 128, 128);
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.45,
      metalness: 0.08,
      emissive: new THREE.Color('#01040a'),
      emissiveIntensity: 0.15,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    globeGroup.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // 2D Flat Equirectangular Map Plane (Plate Carrée Projection: Width 280, Height 140)
    const earthPlaneGeo = new THREE.PlaneGeometry(280, 140, 64, 32);
    const earthPlaneMesh = new THREE.Mesh(earthPlaneGeo, earthMaterial);
    earthPlaneMesh.visible = false;
    globeGroup.add(earthPlaneMesh);
    earthPlaneMeshRef.current = earthPlaneMesh;

    // Subtle Cartographic Grid & Border for 2D Map
    const mapBorderGeo = new THREE.EdgesGeometry(earthPlaneGeo);
    const mapBorderMat = new THREE.LineBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.35 });
    const mapBorder = new THREE.LineSegments(mapBorderGeo, mapBorderMat);
    earthPlaneMesh.add(mapBorder);

    // 6. CONTINUOUS OCEANOGRAPHIC THERMAL ANOMALY FIELD (Smooth Interpolated Surface)
    // Dynamic 1024x512 Canvas Texture draped over the ocean
    const aCanvas = document.createElement('canvas');
    aCanvas.width = 1024;
    aCanvas.height = 512;
    anomalyCanvasRef.current = aCanvas;

    const aTexture = new THREE.CanvasTexture(aCanvas);
    aTexture.wrapS = THREE.ClampToEdgeWrapping;
    aTexture.wrapT = THREE.ClampToEdgeWrapping;
    anomalyTextureRef.current = aTexture;

    // 3D Spherical Anomaly Mesh
    const anomalyGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.004, 128, 128);
    const anomalyMat = new THREE.MeshBasicMaterial({
      map: aTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });
    const anomalyMesh = new THREE.Mesh(anomalyGeo, anomalyMat);
    globeGroup.add(anomalyMesh);
    anomalyMeshRef.current = anomalyMesh;

    // 2D Flat Anomaly Plane Mesh
    const anomalyPlaneGeo = new THREE.PlaneGeometry(280, 140, 64, 32);
    const anomalyPlaneMat = new THREE.MeshBasicMaterial({
      map: aTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });
    const anomalyPlaneMesh = new THREE.Mesh(anomalyPlaneGeo, anomalyPlaneMat);
    anomalyPlaneMesh.position.z = 0.35;
    anomalyPlaneMesh.visible = false;
    globeGroup.add(anomalyPlaneMesh);
    anomalyPlaneMeshRef.current = anomalyPlaneMesh;

    // 7. Volumetric Atmosphere Shell (Rayleigh scattering outer glow)
    const atmosOuterGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.038, 64, 64);
    const atmosOuterMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.60 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
          gl_FragColor = vec4(0.0, 0.9, 1.0, 1.0) * intensity * 1.15;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosOuterMesh = new THREE.Mesh(atmosOuterGeo, atmosOuterMat);
    scene.add(atmosOuterMesh);
    atmosOuterMeshRef.current = atmosOuterMesh;

    // Inner Fresnel limb brightening (giving the Earth curve realistic depth)
    const atmosInnerGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.006, 64, 64);
    const atmosInnerMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
          gl_FragColor = vec4(0.02, 0.55, 0.95, 0.65) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
    });
    const atmosInnerMesh = new THREE.Mesh(atmosInnerGeo, atmosInnerMat);
    globeGroup.add(atmosInnerMesh);
    atmosInnerMeshRef.current = atmosInnerMesh;

    // 8. 4D Depth Horizon Isobar Disc
    const isobarGeo = new THREE.RingGeometry(EARTH_RADIUS * 0.94, EARTH_RADIUS * 1.015, 64);
    const isobarMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const isobarMesh = new THREE.Mesh(isobarGeo, isobarMat);
    isobarMesh.rotation.x = Math.PI / 2;
    globeGroup.add(isobarMesh);
    depthIsobarMeshRef.current = isobarMesh;

    // 9. 4D Perpetual Ocean Currents (Luminous streaming vectors - strictly oceanic)
    const currentParticlesCount = 500;
    const currentPositions = new Float32Array(currentParticlesCount * 3);
    const currentVelocities: { u: number; v: number; lat: number; lon: number }[] = [];

    const spawnOceanPoint = () => {
      let lat = 0;
      let lon = 0;
      let attempts = 0;
      do {
        const region = Math.random();
        if (region < 0.45) {
          // Arabian Sea
          lon = 56.0 + Math.random() * 18.0;
          lat = 2.0 + Math.random() * 22.0;
        } else if (region < 0.85) {
          // Bay of Bengal & Andaman Sea
          lon = 80.5 + Math.random() * 16.0;
          lat = 2.0 + Math.random() * 20.0;
        } else {
          // Equatorial / Southern Indian Ocean
          lon = 55.0 + Math.random() * 45.0;
          lat = -10.0 + Math.random() * 12.0;
        }
        attempts++;
      } while (!isOcean(lat, lon) && attempts < 25);
      return { lat, lon };
    };

    for (let i = 0; i < currentParticlesCount; i++) {
      const { lat, lon } = spawnOceanPoint();
      const pos = latLonToVector3(lat, lon, EARTH_RADIUS * 1.006);
      currentPositions[i * 3] = pos.x;
      currentPositions[i * 3 + 1] = pos.y;
      currentPositions[i * 3 + 2] = pos.z;

      const u = (lat > 5 ? 0.06 : -0.08) + (Math.random() - 0.5) * 0.02;
      const v = (Math.sin(lon * 0.1) * 0.03) + (Math.random() - 0.5) * 0.015;
      currentVelocities.push({ u, v, lat, lon });
    }

    const currentsGeo = new THREE.BufferGeometry();
    currentsGeo.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    const currentsMat = new THREE.PointsMaterial({
      map: createCurrentParticleTexture(),
      color: 0x00f2fe,
      size: 2.2,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const currentsPoints = new THREE.Points(currentsGeo, currentsMat);
    globeGroup.add(currentsPoints);
    currentsGroupRef.current = currentsPoints;

    // 10. Groups for Floats and Trajectories
    const trajectoriesGroup = new THREE.Group();
    globeGroup.add(trajectoriesGroup);
    trajectoriesGroupRef.current = trajectoriesGroup;

    const floatsGroup = new THREE.Group();
    globeGroup.add(floatsGroup);
    floatsGroupRef.current = floatsGroup;

    // 11. Lighting (Balanced for crisp land-sea contrast without washout)
    const ambientLight = new THREE.AmbientLight(0x0f223f, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
    sunLight.position.set(280, 200, 350);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x00f2fe, 0.85);
    rimLight.position.set(-250, -100, -200);
    scene.add(rimLight);

    // Deep Space Starfield
    const starCount = 1600;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 2000;
      starPos[i + 1] = (Math.random() - 0.5) * 2000;
      starPos[i + 2] = (Math.random() - 0.5) * 2000;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 1.0,
      transparent: true,
      opacity: 0.5,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // Initial camera orientation on Bay of Bengal
    globeGroup.rotation.y = -Math.PI * 0.45;
    globeGroup.rotation.x = Math.PI * 0.08;

    // 12. Animation Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Streamline particles flow (strictly oceanic)
      if (currentsGroupRef.current) {
        const posAttr = currentsGroupRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;

        for (let i = 0; i < currentParticlesCount; i++) {
          const vel = currentVelocities[i];
          vel.lon += vel.u * 0.7;
          vel.lat += vel.v * 0.7;

          // If particle flows outside boundaries or hits land, respawn in ocean
          if (vel.lon > 102.0 || vel.lon < 54.0 || vel.lat > 25.0 || vel.lat < -12.0 || !isOcean(vel.lat, vel.lon)) {
            const respawn = spawnOceanPoint();
            vel.lat = respawn.lat;
            vel.lon = respawn.lon;
          }

          if (viewModeRef.current === '2D') {
            arr[i * 3] = (vel.lon / 180.0) * 140.0;
            arr[i * 3 + 1] = (vel.lat / 90.0) * 70.0;
            arr[i * 3 + 2] = 0.8;
          } else {
            const p = latLonToVector3(vel.lat, vel.lon, EARTH_RADIUS * 1.006);
            arr[i * 3] = p.x;
            arr[i * 3 + 1] = p.y;
            arr[i * 3 + 2] = p.z;
          }
        }
        posAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Switch between 3D Planetary Globe and 2D Cartographic Map Projection
  useEffect(() => {
    viewModeRef.current = viewMode;
    if (!globeGroupRef.current || !controlsRef.current || !cameraRef.current) return;

    if (viewMode === '2D') {
      // 2D Flat Equirectangular Map Mode
      if (earthMeshRef.current) earthMeshRef.current.visible = false;
      if (anomalyMeshRef.current) anomalyMeshRef.current.visible = false;
      if (atmosOuterMeshRef.current) atmosOuterMeshRef.current.visible = false;
      if (atmosInnerMeshRef.current) atmosInnerMeshRef.current.visible = false;
      if (depthIsobarMeshRef.current) depthIsobarMeshRef.current.visible = false;
      if (earthPlaneMeshRef.current) earthPlaneMeshRef.current.visible = true;
      if (anomalyPlaneMeshRef.current) anomalyPlaneMeshRef.current.visible = true;

      globeGroupRef.current.rotation.set(0, 0, 0);
      cameraRef.current.position.set(0, 0, 205);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.enableRotate = false; // Disables 3D rotation, allows 2D map panning
      controlsRef.current.autoRotate = false;
    } else {
      // 3D Spherical Globe Mode
      if (earthMeshRef.current) earthMeshRef.current.visible = true;
      if (anomalyMeshRef.current) anomalyMeshRef.current.visible = true;
      if (atmosOuterMeshRef.current) atmosOuterMeshRef.current.visible = true;
      if (atmosInnerMeshRef.current) atmosInnerMeshRef.current.visible = true;
      if (depthIsobarMeshRef.current) depthIsobarMeshRef.current.visible = true;
      if (earthPlaneMeshRef.current) earthPlaneMeshRef.current.visible = false;
      if (anomalyPlaneMeshRef.current) anomalyPlaneMeshRef.current.visible = false;

      globeGroupRef.current.rotation.y = -Math.PI * 0.45;
      globeGroupRef.current.rotation.x = Math.PI * 0.08;
      cameraRef.current.position.set(0, 50, 275);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.enableRotate = true;
      controlsRef.current.autoRotate = isAutoRotating;
    }
  }, [viewMode, isAutoRotating]);

  // Update Auto-Rotate
  useEffect(() => {
    if (controlsRef.current && viewMode === '3D') {
      controlsRef.current.autoRotate = isAutoRotating;
    }
  }, [isAutoRotating, viewMode]);

  // Update Continuous Thermal Anomaly Surface Texture
  useEffect(() => {
    if (!anomalyCanvasRef.current || !anomalyTextureRef.current) return;
    const canvas = anomalyCanvasRef.current;
    const ctx = canvas.getContext('2d')!;

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!spatialGrid || spatialGrid.length === 0) {
      anomalyTextureRef.current.needsUpdate = true;
      return;
    }

    // Draw continuous radial blended Gaussian heat fields across the canvas (ocean only)
    spatialGrid.forEach((pt) => {
      if (!isOcean(pt.lat, pt.lon)) return; // Strict land-mask: ocean only
      const cx = ((pt.lon + 180.0) / 360.0) * canvas.width;
      const cy = ((90.0 - pt.lat) / 180.0) * canvas.height;
      const radius = 28.0; // Soft gaussian blend radius

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, getFieldRgba(pt.anomaly, activeVariable, 0.65));
      grad.addColorStop(0.5, getFieldRgba(pt.anomaly, activeVariable, 0.35));
      grad.addColorStop(1.0, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    anomalyTextureRef.current.needsUpdate = true;
  }, [spatialGrid]);

  // Update ARGO 3D Float Models (Iconic Yellow Profiling Floats in 3D Globe & 2D Map)
  useEffect(() => {
    if (!floatsGroupRef.current || !trajectoriesGroupRef.current) return;
    const fGroup = floatsGroupRef.current;
    const tGroup = trajectoriesGroupRef.current;

    fGroup.clear();
    tGroup.clear();

    if (!floats || floats.length === 0) return;

    const is2D = viewMode === '2D';
    const surfaceR = EARTH_RADIUS * 1.01;
    // 4D Depth level displacement: deeper observations dip below sea level
    const depthOffsetRatio = (depth / 2000.0) * 8.0;
    const currentDepthR = surfaceR - depthOffsetRatio;

    floats.forEach((fl) => {
      const isSelected = selectedFloat?.float_id === fl.float_id;
      let floatPos: THREE.Vector3;
      let surfacePos: THREE.Vector3;

      if (is2D) {
        const x = (fl.last_longitude / 180.0) * 140.0;
        const y = (fl.last_latitude / 90.0) * 70.0;
        surfacePos = new THREE.Vector3(x, y, 0.6);
        floatPos = new THREE.Vector3(x, y, 1.6);
      } else {
        surfacePos = latLonToVector3(fl.last_latitude, fl.last_longitude, surfaceR);
        floatPos = latLonToVector3(fl.last_latitude, fl.last_longitude, currentDepthR);
      }

      // Realistic ARGO Float 3D Assembly
      const floatModel = new THREE.Group();
      floatModel.position.copy(floatPos);
      if (is2D) {
        floatModel.rotation.set(Math.PI / 2, 0, 0);
      } else {
        floatModel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), floatPos.clone().normalize());
      }

      // 1. Bright Yellow Cylinder Pressure Hull (Iconic ARGO APEX/PROVOR body)
      const hullGeo = new THREE.CylinderGeometry(0.5, 0.5, 2.2, 12);
      const hullMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xd946ef : (fl.status === 'ACTIVE' ? 0xfacc15 : 0x64748b), // Fuchsia if selected, Yellow if active, Slate if inactive
        roughness: 0.3,
        metalness: 0.2,
      });
      const hullMesh = new THREE.Mesh(hullGeo, hullMat);
      floatModel.add(hullMesh);

      // 2. Black Stabilization Collar Dampener Ring
      const collarGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.35, 12);
      const collarMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const collarMesh = new THREE.Mesh(collarGeo, collarMat);
      collarMesh.position.y = 0.4;
      floatModel.add(collarMesh);

      // 3. Titanium CTD Sensor Head on top
      const ctdGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.5, 8);
      const ctdMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 });
      const ctdMesh = new THREE.Mesh(ctdGeo, ctdMat);
      ctdMesh.position.y = 1.35;
      floatModel.add(ctdMesh);

      // 4. Whip Antenna (Iridium Satellite Link)
      const antPoints = [new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0, 3.2, 0)];
      const antGeo = new THREE.BufferGeometry().setFromPoints(antPoints);
      const antMat = new THREE.LineBasicMaterial({ color: 0x94a3b8 });
      const antLine = new THREE.Line(antGeo, antMat);
      floatModel.add(antLine);

      floatModel.userData = { float: fl };
      fGroup.add(floatModel);

      // 5. Vertical Volumetric CTD Depth Column Line (DISTINCT RADIANT PURPLE)
      const columnPoints = is2D
        ? [
            surfacePos,
            new THREE.Vector3(surfacePos.x, surfacePos.y - (depth / 2000.0) * 6.0, 0.6),
          ]
        : [surfacePos, floatPos];
      const columnGeo = new THREE.BufferGeometry().setFromPoints(columnPoints);
      const columnMat = new THREE.LineBasicMaterial({
        color: isSelected ? 0xd946ef : 0xa855f7, // Radiant Purple
        transparent: true,
        opacity: isSelected ? 1.0 : 0.65,
      });
      const columnLine = new THREE.Line(columnGeo, columnMat);
      fGroup.add(columnLine);

      // 6. Surface Telemetry Radar Ring (LUMINOUS CYAN)
      if (fl.status === 'ACTIVE' || isSelected) {
        const radarGeo = new THREE.RingGeometry(0.8, 1.6, 16);
        const radarMat = new THREE.MeshBasicMaterial({
          color: isSelected ? 0xd946ef : 0x00f2fe,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isSelected ? 0.95 : 0.5,
        });
        const radarMesh = new THREE.Mesh(radarGeo, radarMat);
        radarMesh.position.copy(surfacePos);
        if (!is2D) {
          radarMesh.lookAt(new THREE.Vector3(0, 0, 0));
        }
        fGroup.add(radarMesh);
      }

      // 7. Sleek 3D Drift Trajectory Line (DISTINCT NEON EMERALD GREEN)
      const trajPoints: THREE.Vector3[] = [];
      let cLat = fl.last_latitude;
      let cLon = fl.last_longitude;
      for (let s = 0; s < 12; s++) {
        if (is2D) {
          trajPoints.push(new THREE.Vector3((cLon / 180.0) * 140.0, (cLat / 90.0) * 70.0, 0.7));
        } else {
          trajPoints.push(latLonToVector3(cLat, cLon, currentDepthR));
        }
        cLat -= (Math.sin(s * 0.4 + fl.last_latitude) * 0.28);
        cLon -= (Math.cos(s * 0.3 + fl.last_longitude) * 0.4);
      }
      const curve = new THREE.CatmullRomCurve3(trajPoints);
      const tubeGeo = new THREE.TubeGeometry(curve, 24, isSelected ? 0.32 : 0.14, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x4ade80 : 0x10b981, // Neon Emerald Green
        transparent: true,
        opacity: isSelected ? 0.95 : 0.55,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      tGroup.add(tubeMesh);
    });
  }, [floats, selectedFloat, depth, viewMode]);

  // Smooth camera flight when targetCoords change
  useEffect(() => {
    if (!targetCoords || !globeGroupRef.current || !controlsRef.current || !cameraRef.current) return;
    setHudCoords({ lat: targetCoords.lat, lon: targetCoords.lon });

    if (viewMode === '2D') {
      const targetX = (targetCoords.lon / 180.0) * 140.0;
      const targetY = (targetCoords.lat / 90.0) * 70.0;
      controlsRef.current.target.set(targetX, targetY, 0);
      cameraRef.current.position.set(targetX, targetY, 135);
    } else {
      const targetLonRad = -((targetCoords.lon + 180) * (Math.PI / 180)) + Math.PI;
      const targetLatRad = (targetCoords.lat * (Math.PI / 180)) * 0.5;
      globeGroupRef.current.rotation.y = targetLonRad;
      globeGroupRef.current.rotation.x = targetLatRad;
    }
  }, [targetCoords, viewMode]);

  // Raycasting for float hover tooltip & selection
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !floatsGroupRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(floatsGroupRef.current.children, true);

    let hit = intersects.find((it) => it.object.userData && it.object.userData.float);
    if (!hit) {
      // Check parent
      hit = intersects.find((it) => it.object.parent && it.object.parent.userData && it.object.parent.userData.float);
    }

    if (hit) {
      const fl = hit.object.userData.float || hit.object.parent?.userData.float;
      setHoveredFloat({
        float: fl,
        x: e.clientX,
        y: e.clientY,
      });
    } else {
      setHoveredFloat(null);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !floatsGroupRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(floatsGroupRef.current.children, true);

    let hit = intersects.find((it) => it.object.userData && it.object.userData.float);
    if (!hit) {
      hit = intersects.find((it) => it.object.parent && it.object.parent.userData && it.object.parent.userData.float);
    }

    if (hit) {
      const fl = hit.object.userData.float || hit.object.parent?.userData.float;
      onSelectFloat(fl);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!cameraRef.current) return;
    const delta = direction === 'in' ? -35 : 35;
    cameraRef.current.position.z = Math.max(130, Math.min(500, cameraRef.current.position.z + delta));
  };

  const handleResetCamera = () => {
    if (!cameraRef.current || !globeGroupRef.current) return;
    cameraRef.current.position.set(0, 50, 275);
    globeGroupRef.current.rotation.set(Math.PI * 0.08, -Math.PI * 0.45, 0);
  };

  // Clamp tooltip position so it NEVER overflows off-screen
  const tooltipX = hoveredFloat ? Math.min(window.innerWidth - 300, Math.max(10, hoveredFloat.x + 15)) : 0;
  const tooltipY = hoveredFloat ? Math.min(window.innerHeight - 260, Math.max(70, hoveredFloat.y - 40)) : 0;

  return (
    <div
      className="relative w-full h-full flex-1 overflow-hidden select-none bg-radial from-ocean-900 via-ocean-950 to-black"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {/* 3D WebGL Canvas Mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* UPPER LEFT: Scientific Legend & Depth Isobar Indicator */}
      <div className="absolute top-3.5 left-3.5 glass-panel p-3 rounded-xl border border-cyan-500/20 pointer-events-auto space-y-2 text-xs shadow-lg max-w-[260px]">
        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300 font-semibold uppercase">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Oceanic Heat Field</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-bold">
            {depth}m Depth Slice
          </span>
        </div>

        {/* Temperature Anomaly Diverging Scale */}
        <div className="space-y-1">
          <div className="text-[10px] text-slate-300 flex justify-between font-mono">
            <span>Temperature Anomaly</span>
            <span className="text-cyan-300">(°C)</span>
          </div>
          <div className="h-2 rounded-full w-full bg-gradient-to-r from-blue-600 via-sky-400 via-slate-400 via-amber-400 to-red-600 shadow-inner" />
          <div className="flex justify-between text-[9px] font-mono text-slate-400 px-0.5">
            <span>-2.0</span>
            <span>-1.0</span>
            <span>0.0</span>
            <span>+1.0</span>
            <span>+2.0</span>
          </div>
        </div>

        {/* Symbology with High-Contrast Distinct Color-Coding */}
        <div className="pt-1.5 border-t border-white/5 space-y-1.5 text-[10px] font-mono text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm border border-yellow-200" />
            <span>Yellow: ARGO Profiling Float</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-emerald-400 rounded" />
            <span>Emerald: 10-Day Drift Pathway</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-purple-400 rounded" />
            <span>Purple: CTD Depth Pillar (0–{depth}m)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-glow-cyan" />
            <span>Cyan: Ocean Current Vectors</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 shadow-sm border border-fuchsia-200" />
            <span>Magenta: Selected / Active Float</span>
          </div>
        </div>
      </div>

      {/* UPPER RIGHT: Navigation & Controls */}
      <div className="absolute top-3.5 right-3.5 flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center bg-ocean-950/80 p-0.5 rounded-lg border border-cyan-500/20 text-xs">
          <button
            onClick={() => {
              playClickSound();
              setViewMode('2D');
            }}
            className={`px-2.5 py-1 rounded font-mono text-[11px] transition-all ${
              viewMode === '2D' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-glow-cyan' : 'text-slate-400 hover:text-white'
            }`}
          >
            2D Map
          </button>
          <button
            onClick={() => {
              playClickSound();
              setViewMode('3D');
            }}
            className={`px-2.5 py-1 rounded font-mono text-[11px] transition-all ${
              viewMode === '3D' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-glow-cyan' : 'text-slate-400 hover:text-white'
            }`}
          >
            3D Globe
          </button>
        </div>

        <button
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
            isAutoRotating
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-glow-cyan'
              : 'bg-ocean-950/80 border-white/10 text-slate-400 hover:text-white'
          }`}
          title="Toggle planetary rotation"
        >
          {isAutoRotating ? <Pause className="w-3.5 h-3.5 text-cyan-300" /> : <Play className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Auto-Rotate</span>
        </button>

        <div className="flex items-center bg-ocean-950/80 p-0.5 rounded-lg border border-cyan-500/20">
          <button
            onClick={() => handleZoom('in')}
            className="p-1.5 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom('out')}
            className="p-1.5 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1.5 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Reset Orientation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* LOWER LEFT: Scientific Mission Control Telemetry HUD */}
      <div className="absolute bottom-4 left-4 glass-panel p-2.5 rounded-xl border border-cyan-500/20 text-[10px] font-mono text-slate-300 space-y-1 pointer-events-none hidden sm:block">
        <div className="flex items-center gap-1.5 text-cyan-300 font-bold border-b border-white/5 pb-1">
          <Navigation className="w-3 h-3 text-cyan-400" />
          <span>OCEAN INTELLIGENCE HUD</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Target Coordinates:</span>
          <span className="text-white">{hudCoords.lat.toFixed(2)}°N, {hudCoords.lon.toFixed(2)}°E</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Vertical Slice:</span>
          <span className="text-cyan-300">{depth}m Isobar</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Temporal Frame:</span>
          <span className="text-amber-400 font-bold">{timePeriod}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Field Interpolation:</span>
          <span className="text-emerald-400">Continuous Gaussian (Smooth)</span>
        </div>
      </div>

      {/* LOWER CENTER: 4D Dimension Pill Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-panel px-4 py-1.5 rounded-full border border-cyan-500/30 flex items-center gap-3 text-xs font-mono shadow-glow-blue pointer-events-none">
        <span className="flex items-center gap-1 text-cyan-300">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>4D Space-Time: [Lat, Lon, {depth}m, {timePeriod}]</span>
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-slate-400">
          ARGO Fleet: <strong className="text-white">{floats.length} Floats</strong>
        </span>
      </div>

      {/* FLOAT HOVER TOOLTIP (Correctly Clamped to Screen Bounds) */}
      {hoveredFloat && (
        <div
          className="fixed z-50 glass-panel-highlight p-3 rounded-xl pointer-events-none text-xs space-y-1.5 font-mono shadow-2xl border border-cyan-400 w-64 transition-all duration-75"
          style={{
            left: `${tooltipX}px`,
            top: `${tooltipY}px`,
          }}
        >
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1">
            <span className="font-bold text-cyan-300">
              ARGO Float {hoveredFloat.float.wmo_id}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
              {hoveredFloat.float.status}
            </span>
          </div>
          <div className="text-[11px] text-slate-300 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Lat / Lon:</span>
              <span className="text-cyan-200">
                {hoveredFloat.float.last_latitude.toFixed(2)}°N, {hoveredFloat.float.last_longitude.toFixed(2)}°E
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Slice Depth:</span>
              <span className="text-cyan-300">{depth}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Platform:</span>
              <span>{hoveredFloat.float.platform_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Country:</span>
              <span>{hoveredFloat.float.country}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Profiles:</span>
              <span>{hoveredFloat.float.total_profiles} cycles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Last Telemetry:</span>
              <span className="text-slate-200">{hoveredFloat.float.last_update}</span>
            </div>
          </div>
          <div className="text-[10px] text-cyan-400/80 pt-1 border-t border-white/5 italic">
            Click float to inspect full CTD dossier
          </div>
        </div>
      )}
    </div>
  );
};
