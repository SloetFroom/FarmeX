let scene, camera, renderer, controls, mixer, grid, mainLight, ambientLight, fillLight;
const clock = new THREE.Clock();

// --- SOLUCIÓN PARA MÓVILES ---
const toggleBtn = document.getElementById('toggle-btn');
const uiContainer = document.getElementById('ui-container');

function handleToggle(e) {
    // Evita que el evento se propague al canvas de Three.js
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    uiContainer.classList.toggle('collapsed');
}

// Escuchamos ambos: click para PC y touchstart para respuesta inmediata en móvil
toggleBtn.addEventListener('click', handleToggle);
toggleBtn.addEventListener('touchstart', handleToggle, { passive: false });
// ------------------------------

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x131316); 
    scene.fog = new THREE.Fog(0x131316, 10, 100); 

    // Cuadrícula
    grid = new THREE.GridHelper(100, 100, 0x333333, 0x1a1a1a);
    grid.position.y = -0.01; 
    scene.add(grid);

    // --- SISTEMA DE ILUMINACIÓN ---
    ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(8, 5, 8);
    scene.add(camera); 
    
    mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(1, 1, 2);
    camera.add(mainLight);

    fillLight = new THREE.DirectionalLight(0xddeeff, 1.2);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; 
    renderer.toneMappingExposure = 1.0;
    renderer.physicallyCorrectLights = true; 
    
    document.body.appendChild(renderer.domElement);

    // Controles
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; 
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.update();

    // Eventos de UI
    window.addEventListener('resize', onWindowResize);
    document.getElementById('fileInput').addEventListener('change', loadFile);

    document.getElementById('bgColor').addEventListener('input', (e) => {
        const newColor = new THREE.Color(e.target.value);
        scene.background = newColor;
        scene.fog.color = newColor; 
    });

    document.getElementById('gridToggle').addEventListener('change', (e) => {
        grid.visible = e.target.checked;
    });

    document.getElementById('lightIntensity').addEventListener('input', (e) => {
        const intensity = parseFloat(e.target.value);
        mainLight.intensity = intensity;
        ambientLight.intensity = intensity * 0.3; 
        fillLight.intensity = intensity * 0.5;
    });

    animate();
}

function loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('loader').style.display = 'flex';
    document.getElementById('status').innerHTML = `Leyendo: ${file.name}`;
    
    const url = URL.createObjectURL(file);
    const extension = file.name.split('.').pop().toLowerCase();
    
    setTimeout(() => {
        try {
            switch (extension) {
                case 'fbx': loadModel(new THREE.FBXLoader(), url, extension); break;
                case 'gltf': 
                case 'glb': loadModel(new THREE.GLTFLoader(), url, extension); break;
                case 'obj': loadModel(new THREE.OBJLoader(), url, extension); break;
                case 'stl': loadSTL(url); break;
                default:
                    throw new Error("Formato no soportado.");
            }
        } catch (e) {
            onError(e);
        }
    }, 100);
}

function loadModel(loader, url, ext) {
    loader.load(url, (loadedData) => {
        let object;
        if (ext === 'gltf' || ext === 'glb') {
            object = loadedData.scene;
            if (loadedData.animations && loadedData.animations.length > 0) {
                object.animations = loadedData.animations;
            }
        } else {
            object = loadedData;
        }
        onModelLoaded(object);
    }, onProgress, onError);
}

function loadSTL(url) {
    const loader = new THREE.STLLoader();
    loader.load(url, (geometry) => {
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc, 
            roughness: 0.3, 
            metalness: 0.4 
        });
        const mesh = new THREE.Mesh(geometry, material);
        geometry.center();
        const group = new THREE.Group();
        group.add(mesh);
        onModelLoaded(group);
    }, onProgress, onError);
}

function onModelLoaded(object) {
    const prevModel = scene.getObjectByName('LoadedModel');
    if (prevModel) {
        prevModel.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
                if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
                else o.material.dispose();
            }
        });
        scene.remove(prevModel);
    }

    object.name = 'LoadedModel';
    mixer = null;
    let statusHTML = '';
    
    if (object.animations && object.animations.length > 0) {
        mixer = new THREE.AnimationMixer(object);
        const action = mixer.clipAction(object.animations[0]);
        action.play();
        statusHTML = `<span class="status-success">▶</span> Animación activa`;
    } else {
        statusHTML = `<span class="status-success">✓</span> Modelo cargado`;
    }
    
    document.getElementById('status').innerHTML = statusHTML;

    object.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                    mat.side = THREE.DoubleSide;
                    if (!mat.map && mat.isMeshStandardMaterial) {
                        mat.roughness = 0.5;
                        mat.metalness = 0.1;
                    }
                });
            }
        }
    });

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    object.position.x = -center.x;
    object.position.y = -center.y; 
    object.position.z = -center.z;
    
    const pivot = new THREE.Group();
    pivot.add(object);
    pivot.name = 'LoadedModel'; 
    
    const yOffset = size.y / 2;
    object.position.y += yOffset; 

    scene.add(pivot);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraDist *= 1.8;
    
    const direction = new THREE.Vector3(1, 0.6, 1).normalize();
    const finalPos = direction.multiplyScalar(cameraDist);

    camera.position.copy(finalPos);
    camera.lookAt(0, size.y / 2, 0);
    
    controls.target.set(0, size.y / 2, 0);
    controls.update();
    
    scene.fog.near = cameraDist * 2;
    scene.fog.far = cameraDist * 5;

    document.getElementById('loader').style.display = 'none';
    
    // Auto-colapsar en móviles al cargar
    if(window.innerWidth <= 768) {
        uiContainer.classList.add('collapsed');
    }
}

function onProgress(xhr) {
    if(xhr.lengthComputable) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        document.getElementById('status').innerText = `Cargando: ${percent}%`;
    }
}

function onError(error) {
    console.error(error);
    document.getElementById('loader').style.display = 'none';
    document.getElementById('status').innerHTML = `<span class="status-error">⚠ Error</span>`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    
    controls.update();
    renderer.render(scene, camera);
}

init();
