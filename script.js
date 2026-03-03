// --- INTERFAZ UI ---
function toggleDesktopPanel(id) {
    document.getElementById(id).classList.toggle('collapsed');
}

const mobNavItems = document.querySelectorAll('.mob-nav-item');
const mobPanels = document.querySelectorAll('.mob-panel');
const mobOverlay = document.getElementById('mob-overlay');

function closeAllMobPanels() {
    mobPanels.forEach(p => p.classList.remove('active'));
    mobNavItems.forEach(n => n.classList.remove('active'));
    if(mobOverlay) mobOverlay.classList.remove('active');
}

mobNavItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        const targetPanel = document.getElementById(targetId);
        const isActive = targetPanel.classList.contains('active');
        
        closeAllMobPanels();
        if(!isActive) {
            targetPanel.classList.add('active');
            item.classList.add('active');
            if(mobOverlay) mobOverlay.classList.add('active');
        }
    });
});

function updateStatText(selectorClass, text) {
    document.querySelectorAll('.' + selectorClass).forEach(el => el.innerHTML = text);
}

// Sincronización Universal de Controles
function syncLighting(val) {
    mainLight.intensity = val;
    ambientLight.intensity = val * 0.5;
    document.getElementById('lightIntensity').value = val;
    document.getElementById('m-lightIntensity').value = val;
}
document.getElementById('lightIntensity').addEventListener('input', e => syncLighting(parseFloat(e.target.value)));
document.getElementById('m-lightIntensity').addEventListener('input', e => syncLighting(parseFloat(e.target.value)));

function syncBackground(hexStr) {
    scene.background.set(hexStr);
    document.getElementById('bgColor').value = hexStr;
    document.getElementById('m-bgColor').value = hexStr;
    document.querySelector('.m-bg-claro').classList.toggle('active', hexStr === '#ffffff');
    document.querySelector('.m-bg-oscuro').classList.toggle('active', hexStr === '#000000');
}
document.getElementById('bgColor').addEventListener('input', e => syncBackground(e.target.value));
document.getElementById('m-bgColor').addEventListener('input', e => syncBackground(e.target.value));

document.querySelector('.m-bg-claro').addEventListener('click', () => { syncBackground('#ffffff'); closeAllMobPanels(); });
document.querySelector('.m-bg-oscuro').addEventListener('click', () => { syncBackground('#000000'); closeAllMobPanels(); });

function syncGrid(val) {
    grid.visible = (val === 'si');
    document.querySelector(`input[name="grid"][value="${val}"]`).checked = true;
    document.querySelector(`input[name="m-grid"][value="${val}"]`).checked = true;
}
document.querySelectorAll('input[name="grid"], input[name="m-grid"]').forEach(r => r.addEventListener('change', e => syncGrid(e.target.value)));

// --- LÓGICA THREE.JS ---
let scene, camera, renderer, controls, grid, mixer;
let mainLight, ambientLight, floorPlan;
let currentModel = null;

let isWireframe = false;
let shadowsEnabled = false;

/* Variables de Cinemática Suave */
let isCinematic = false;
let cinematicTime = 0;
let modelSize = 5;

const clock = new THREE.Clock();
const initialCamPos = new THREE.Vector3(8, 5, 8);

function init() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Renderizador con Sombras
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true; 
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Cuadricula
    grid = new THREE.GridHelper(100, 100, 0x333333, 0x111111);
    grid.position.y = -0.01; 
    scene.add(grid);

    // Suelo invisible para recibir sombras
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.6 });
    floorPlan = new THREE.Mesh(floorGeo, floorMat);
    floorPlan.rotation.x = -Math.PI / 2;
    floorPlan.position.y = -0.02;
    floorPlan.receiveShadow = true;
    scene.add(floorPlan);

    // Luces
    ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(ambientLight);

    mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(10, 20, 15);
    mainLight.castShadow = true; 
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.001;
    scene.add(mainLight);

    // Camara
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.copy(initialCamPos);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.05;

    setupEvents(); 
    animate();
}

function setupEvents() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.querySelectorAll('.fileInput').forEach(inp => { inp.addEventListener('change', handleUpload); });

    // Toggle de Sombras
    document.querySelectorAll('input[name="shadows"], input[name="m-shadows"]').forEach(r => r.addEventListener('change', e => {
        shadowsEnabled = (e.target.value === 'si');
        document.querySelector(`input[name="shadows"][value="${e.target.value}"]`).checked = true;
        document.querySelector(`input[name="m-shadows"][value="${e.target.value}"]`).checked = true;
        if(currentModel) {
            currentModel.traverse(child => {
                if(child.isMesh) {
                    child.castShadow = shadowsEnabled;
                    child.receiveShadow = shadowsEnabled;
                }
            });
        }
    }));

    // Botones de Cámara
    document.querySelectorAll('.btn-wireframe').forEach(btn => {
        btn.addEventListener('click', () => {
            if(!currentModel) return;
            isWireframe = !isWireframe;
            currentModel.traverse(child => {
                if(child.isMesh && child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach(m => { m.wireframe = isWireframe; m.needsUpdate = true; });
                }
            });
            document.querySelectorAll('.btn-wireframe').forEach(b => {
                b.innerHTML = `<span class="list-icon"></span> WireFrame: ${isWireframe ? 'ON' : 'Off'}`;
                b.classList.toggle('active', isWireframe);
            });
        });
    });

    document.querySelectorAll('.btn-rotate').forEach(btn => {
        btn.addEventListener('click', () => {
            controls.autoRotate = !controls.autoRotate;
            document.querySelectorAll('.btn-rotate').forEach(b => {
                b.innerHTML = `<span class="list-icon"></span> Rotacion: ${controls.autoRotate ? 'ON' : 'Off'}`;
                b.classList.toggle('active', controls.autoRotate);
            });
        });
    });

    document.querySelectorAll('.btn-reset').forEach(btn => {
        btn.addEventListener('click', () => {
            isCinematic = false;
            controls.enabled = true;
            camera.position.copy(initialCamPos);
            controls.target.set(0,0,0);
            controls.update();
        });
    });
}

// Función global llamada por el botón verde para activar modo película (barrido suave)
window.toggleCinematic = function() {
    if(!currentModel) return;
    isCinematic = !isCinematic;
    controls.enabled = !isCinematic; // Apaga los controles manuales si está en cinemática
    if(isCinematic) cinematicTime = 0; // reinicia el ángulo
};

function cleanMemory() {
    if (!currentModel) return;
    currentModel.traverse(child => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach(m => {
                    m.dispose();
                    if (m.map) m.map.dispose(); if (m.normalMap) m.normalMap.dispose();
                    if (m.roughnessMap) m.roughnessMap.dispose();
                });
            }
        }
    });
    scene.remove(currentModel); currentModel = null;
}

function handleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    closeAllMobPanels();

    const mbSize = (file.size / (1024*1024)).toFixed(2);
    updateStatText('stat-size', `${mbSize} MB`);
    
    const ext = file.name.split('.').pop().toLowerCase();
    updateStatText('stat-format', ext.toUpperCase());

    document.getElementById('loader').style.display = 'flex';
    document.getElementById('loader-text').innerText = 'LEYENDO ARCHIVO...';
    const url = URL.createObjectURL(file);

    setTimeout(() => {
        try {
            if (['gltf', 'glb'].includes(ext)) {
                new THREE.GLTFLoader().load(url, res => displayModel(res.scene, res.animations), onProgress, onError);
            } else if (ext === 'fbx') {
                new THREE.FBXLoader().load(url, res => displayModel(res, res.animations), onProgress, onError);
            } else if (ext === 'obj') {
                new THREE.OBJLoader().load(url, res => displayModel(res), onProgress, onError);
            } else if (ext === 'stl') {
                new THREE.STLLoader().load(url, geom => {
                    const mat = new THREE.MeshStandardMaterial({color: 0x888888, roughness: 0.5, metalness: 0.5});
                    const mesh = new THREE.Mesh(geom, mat);
                    geom.center();
                    const grp = new THREE.Group(); grp.add(mesh);
                    displayModel(grp);
                }, onProgress, onError);
            } else { throw new Error("Formato inválido"); }
        } catch(err) { onError(err); }
    }, 50);
}

function displayModel(model, animations) {
    cleanMemory();
    isWireframe = false;
    isCinematic = false;
    controls.enabled = true;
    
    document.querySelectorAll('.btn-wireframe').forEach(b => {
        b.innerHTML = '<span class="list-icon"></span> WireFrame: Off'; b.classList.remove('active');
    });

    mixer = null;
    if (animations && animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(animations[0]).play();
    }

    let verts = 0, tris = 0;
    let mats = new Set(), tex = new Set();

    model.traverse(child => {
        if (child.isMesh) {
            child.castShadow = shadowsEnabled;
            child.receiveShadow = shadowsEnabled;
            
            if(child.geometry) {
                verts += child.geometry.attributes.position ? child.geometry.attributes.position.count : 0;
                if(child.geometry.index) tris += child.geometry.index.count / 3;
                else if(child.geometry.attributes.position) tris += child.geometry.attributes.position.count / 3;
            }
            if (child.material) {
                child.material.side = THREE.DoubleSide; 
                const mArr = Array.isArray(child.material) ? child.material : [child.material];
                mArr.forEach(m => {
                    mats.add(m.uuid);
                    if(m.map) tex.add(m.map.uuid); if(m.normalMap) tex.add(m.normalMap.uuid);
                    if(m.roughnessMap) tex.add(m.roughnessMap.uuid);
                });
            }
        }
    });

    updateStatText('stat-vertices', verts.toLocaleString());
    updateStatText('stat-triangles', tris.toLocaleString());
    updateStatText('stat-materials', mats.size);
    updateStatText('stat-texturas', tex.size);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    model.position.sub(center); model.position.y += size.y / 2;
    
    scene.add(model); currentModel = model;

    const maxDim = Math.max(size.x, size.y, size.z);
    modelSize = maxDim; 
    const dist = maxDim * 1.5;
    
    mainLight.shadow.camera.top = maxDim;
    mainLight.shadow.camera.bottom = -maxDim;
    mainLight.shadow.camera.left = -maxDim;
    mainLight.shadow.camera.right = maxDim;
    mainLight.shadow.camera.updateProjectionMatrix();

    initialCamPos.set(dist, dist*0.8, dist);
    document.querySelectorAll('.btn-reset')[0].click();
    document.getElementById('loader').style.display = 'none';
}

function onProgress(xhr) {
    if(xhr.lengthComputable) {
        const pct = Math.round((xhr.loaded / xhr.total) * 100);
        document.getElementById('loader-text').innerText = `CARGANDO MODELO: ${pct}%`;
    }
}

function onError(err) {
    console.error("Error:", err);
    document.getElementById('loader-text').innerText = 'ERROR DE LECTURA';
    setTimeout(() => document.getElementById('loader').style.display='none', 2500);
}

function animate() {
    requestAnimationFrame(animate);
    if(mixer) mixer.update(clock.getDelta());
    
    /* Lógica para Cinemática: Efecto Péndulo Suave */
    if(isCinematic && currentModel) {
        cinematicTime += 0.005; // Velocidad del movimiento
        const dist = modelSize * 1.8;
        const sweepAngle = Math.sin(cinematicTime) * 1.5; // El barrido máximo
        
        camera.position.x = Math.sin(sweepAngle) * dist;
        camera.position.z = Math.cos(sweepAngle) * dist;
        camera.position.y = (Math.sin(cinematicTime * 2) * (dist * 0.1)) + (dist * 0.6);
        camera.lookAt(0, modelSize * 0.2, 0); // Siempre enfoca al modelo
    } else {
        controls.update();
    }
    
    renderer.render(scene, camera);
}

init();
