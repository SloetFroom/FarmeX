let scene, camera, renderer, controls, mixer;
let mainLight, ambientLight;
let currentModel = null;
let isWireframe = false;
let initialCameraPos = new THREE.Vector3();
let initialControlsTarget = new THREE.Vector3();
let sidebarHidden = false;
let grid;

const clock = new THREE.Clock();

function init() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0d);
    scene.fog = new THREE.Fog(0x0a0a0d, 10, 100);

    // Cuadrícula
    grid = new THREE.GridHelper(100, 100, 0x333333, 0x1a1a1a);
    grid.position.y = -0.01;
    scene.add(grid);

    ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(ambientLight);

    mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.5);
    fillLight.position.set(-5, 5, 5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffaa00, 0.5);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 10000);
    camera.position.set(8, 5, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    setupEventListeners();
    animate();
}

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    
    // Toggle Sidebar
    document.getElementById('toggleSidebar').addEventListener('click', toggleSidebar);
    
    // Controles Avanzados de Entorno
    document.getElementById('bgColor').addEventListener('input', (e) => {
        const newColor = new THREE.Color(e.target.value);
        scene.background = newColor;
        scene.fog.color = newColor;
    });

    document.getElementById('gridToggle').addEventListener('change', (e) => {
        if (grid) grid.visible = e.target.checked;
    });

    // Luz
    document.getElementById('lightIntensity').addEventListener('input', (e) => {
        const intensity = parseFloat(e.target.value);
        if (mainLight) mainLight.intensity = intensity;
        if (ambientLight) ambientLight.intensity = intensity * 0.5;
    });

    // Controles UI
    document.getElementById('btn-wireframe').addEventListener('click', toggleWireframe);
    document.getElementById('btn-reset').addEventListener('click', resetCamera);
    document.getElementById('btn-autorotate').addEventListener('click', toggleAutoRotate);
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebarHidden = !sidebarHidden;
    
    if (sidebarHidden) {
        sidebar.classList.add('hidden');
    } else {
        sidebar.classList.remove('hidden');
    }
    
    // Esperar a que la animación termine antes de hacer resize
    setTimeout(() => {
        onWindowResize();
    }, 300);
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Calcular tamaño de archivo
    const fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    document.getElementById('stat-size').innerText = fileSize;

    document.getElementById('loader').style.display = 'flex';
    document.getElementById('status').innerHTML = `<span style="color:var(--primary)">Cargando: ${file.name}</span>`;
    
    const url = URL.createObjectURL(file);
    const extension = file.name.split('.').pop().toLowerCase();
    
    document.getElementById('stat-format').innerText = extension.toUpperCase();

    setTimeout(() => {
        try {
            switch (extension) {
                case 'fbx': loadModel(new THREE.FBXLoader(), url, extension); break;
                case 'gltf': 
                case 'glb': loadModel(new THREE.GLTFLoader(), url, extension); break;
                case 'obj': loadModel(new THREE.OBJLoader(), url, extension); break;
                case 'stl': loadSTL(url); break;
                default: throw new Error("Formato no soportado.");
            }
        } catch (e) {
            onError(e);
        }
    }, 100);
}

function loadModel(loader, url, ext) {
    loader.load(url, (loadedData) => {
        let object = (ext === 'gltf' || ext === 'glb') ? loadedData.scene : loadedData;
        if (ext === 'gltf' || ext === 'glb') {
            if (loadedData.animations && loadedData.animations.length > 0) {
                object.animations = loadedData.animations;
            }
        }
        onModelLoaded(object);
    }, onProgress, onError);
}

function loadSTL(url) {
    const loader = new THREE.STLLoader();
    loader.load(url, (geometry) => {
        const material = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.2 });
        const mesh = new THREE.Mesh(geometry, material);
        geometry.center();
        const group = new THREE.Group();
        group.add(mesh);
        onModelLoaded(group);
    }, onProgress, onError);
}

function onModelLoaded(object) {
    if (currentModel) {
        currentModel.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
                Array.isArray(o.material) ? o.material.forEach(m => m.dispose()) : o.material.dispose();
            }
        });
        scene.remove(currentModel.parent); // Remover el pivot
    }

    object.name = 'LoadedModel';
    mixer = null;
    isWireframe = false;
    document.getElementById('btn-wireframe').classList.remove('active');
    
    if (object.animations && object.animations.length > 0) {
        mixer = new THREE.AnimationMixer(object);
        mixer.clipAction(object.animations[0]).play();
    }
    
    document.getElementById('status').innerHTML = `<span style="color:var(--success)">✓ Modelo cargado exitosamente</span>`;
    
    let vertices = 0, triangles = 0;
    let materialsMap = new Set();
    let texturesMap = new Set();

    object.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Conteo geométrico
            if(child.geometry) {
                vertices += child.geometry.attributes.position ? child.geometry.attributes.position.count : 0;
                if(child.geometry.index) {
                    triangles += child.geometry.index.count / 3;
                } else if(child.geometry.attributes.position) {
                    triangles += child.geometry.attributes.position.count / 3;
                }
            }

            // Materiales y Texturas
            if (child.material) {
                child.material.side = THREE.DoubleSide;
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach(mat => {
                    materialsMap.add(mat.uuid);
                    if(mat.map) texturesMap.add(mat.map.uuid);
                    if(mat.normalMap) texturesMap.add(mat.normalMap.uuid);
                    if(mat.roughnessMap) texturesMap.add(mat.roughnessMap.uuid);
                    if(mat.metalnessMap) texturesMap.add(mat.metalnessMap.uuid);
                });
            }
        }
    });

    // Actualizar UI de Estadísticas
    document.getElementById('stat-vertices').innerText = vertices.toLocaleString();
    document.getElementById('stat-triangles').innerText = triangles.toLocaleString();
    document.getElementById('stat-materials').innerText = materialsMap.size;
    document.getElementById('stat-textures').innerText = texturesMap.size;

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    object.position.set(-center.x, -center.y, -center.z);
    
    const pivot = new THREE.Group();
    pivot.add(object);
    pivot.position.y += size.y / 2; 
    scene.add(pivot);
    currentModel = object;

    // Configuración de Cámara
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8;
    
    const direction = new THREE.Vector3(1, 0.6, 1).normalize();
    initialCameraPos.copy(direction.multiplyScalar(cameraDist));
    initialControlsTarget.set(0, size.y / 2, 0);

    resetCamera();
    scene.fog.near = cameraDist * 2;
    scene.fog.far = cameraDist * 5;
    document.getElementById('loader').style.display = 'none';
}

function onProgress(xhr) {
    if(xhr.lengthComputable) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        document.getElementById('loaderText').innerText = `CARGANDO: ${percent}%`;
    }
}

function onError(error) {
    console.error(error);
    document.getElementById('loader').style.display = 'none';
    document.getElementById('status').innerHTML = `<span style="color:var(--error)">⚠ Error al cargar</span>`;
}

function toggleWireframe() {
    if(!currentModel) return;
    isWireframe = !isWireframe;
    currentModel.traverse(child => {
        if(child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => mat.wireframe = isWireframe);
        }
    });
    const btn = document.getElementById('btn-wireframe');
    btn.innerText = `Wireframe: ${isWireframe ? 'ON' : 'OFF'}`;
    btn.classList.toggle('active', isWireframe);
}

function resetCamera() {
    camera.position.copy(initialCameraPos);
    controls.target.copy(initialControlsTarget);
    controls.update();
}

function toggleAutoRotate() {
    controls.autoRotate = !controls.autoRotate;
    const btn = document.getElementById('btn-autorotate');
    btn.innerText = `Rotación: ${controls.autoRotate ? 'ON' : 'OFF'}`;
    btn.classList.toggle('active', controls.autoRotate);
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    const btn = document.getElementById('btn-theme');
    btn.innerText = `Modo: ${isLight ? 'Claro' : 'Oscuro'}`;
    
    const color = isLight ? 0xf3f4f6 : 0x0f0f11;
    scene.background.setHex(color);
    scene.fog.color.setHex(color);
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    if (!container || !renderer || !camera) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    controls.update();
    renderer.render(scene, camera);
}

init();