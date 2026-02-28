// --- LÓGICA DE INTERFAZ UI MÓVIL Y DESKTOP ---
const controlsPanel = document.getElementById('controls-panel');
const gearBtn = document.getElementById('gear-btn');
const actionsPanel = document.getElementById('actions-panel');

function toggleControlsDesktop() {
    const isVisible = controlsPanel.classList.contains('visible');
    if (isVisible) {
        controlsPanel.classList.remove('visible');
        gearBtn.style.display = 'flex';
    } else {
        controlsPanel.classList.add('visible');
        gearBtn.style.display = 'none';
    }
}
function toggleActionsDesktop() { actionsPanel.classList.toggle('collapsed'); }

// Navegación Móvil
const mobNavItems = document.querySelectorAll('.mob-nav-item');
const mobPanels = document.querySelectorAll('.mob-panel');
const mobCloseBtns = document.querySelectorAll('.mob-close-btn');

function closeAllMobPanels() {
    mobPanels.forEach(p => p.classList.remove('active'));
    mobNavItems.forEach(n => n.classList.remove('active'));
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
        }
    });
});
mobCloseBtns.forEach(btn => btn.addEventListener('click', closeAllMobPanels));

// Actualizar Textos Estadísticas Múltiples (Escritorio y Móvil)
function updateStatText(selectorClass, text) {
    document.querySelectorAll('.' + selectorClass).forEach(el => el.innerText = text);
}

// Sincronizar Controles Universales (Escritorio y Móvil)
function syncLighting(val) {
    mainLight.intensity = val;
    ambientLight.intensity = val * 0.5;
    fillLight.intensity = val * 0.4;
    document.getElementById('lightIntensity').value = val;
    document.getElementById('m-lightIntensity').value = val;
}
document.getElementById('lightIntensity').addEventListener('input', e => syncLighting(parseFloat(e.target.value)));
document.getElementById('m-lightIntensity').addEventListener('input', e => syncLighting(parseFloat(e.target.value)));

function syncBackground(hexStr) {
    scene.background.set(hexStr);
    document.getElementById('bgColor').value = hexStr;
    document.getElementById('m-bgColor').value = hexStr;
}
document.getElementById('bgColor').addEventListener('input', e => syncBackground(e.target.value));
document.getElementById('m-bgColor').addEventListener('input', e => syncBackground(e.target.value));

// Botones rápidos de Fondo Móvil
document.querySelector('.m-bg-claro').addEventListener('click', () => syncBackground('#ffffff'));
document.querySelector('.m-bg-oscuro').addEventListener('click', () => syncBackground('#000000'));

function syncGrid(val) {
    grid.visible = (val === 'si');
    document.querySelector(`input[name="grid"][value="${val}"]`).checked = true;
    document.querySelector(`input[name="m-grid"][value="${val}"]`).checked = true;
}
document.querySelectorAll('input[name="grid"]').forEach(r => r.addEventListener('change', e => syncGrid(e.target.value)));
document.querySelectorAll('input[name="m-grid"]').forEach(r => r.addEventListener('change', e => syncGrid(e.target.value)));

// --- LÓGICA THREE.JS ---
let scene, camera, renderer, controls, grid, mixer;
let mainLight, ambientLight, fillLight;
let currentModel = null;
let isWireframe = false;

const clock = new THREE.Clock();
const initialCamPos = new THREE.Vector3(8, 5, 8);

function init() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    grid = new THREE.GridHelper(100, 100, 0x333333, 0x111111);
    grid.position.y = -0.01; 
    scene.add(grid);

    ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(ambientLight);

    mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 10, 7);
    scene.add(mainLight);

    fillLight = new THREE.DirectionalLight(0xddeeff, 0.5);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.copy(initialCamPos);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.05;

    setupEvents(); animate();
}

function setupEvents() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Conectar ambos file inputs (Escritorio y Móvil)
    document.querySelectorAll('.fileInput').forEach(inp => {
        inp.addEventListener('change', handleUpload);
    });

    // Acciones de Cámara (Conectar todos los botones a la misma lógica)
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
                b.innerText = `Wireframe: ${isWireframe ? 'ON' : 'Off'}`;
                b.classList.toggle('active', isWireframe);
            });
        });
    });

    document.querySelectorAll('.btn-rotate').forEach(btn => {
        btn.addEventListener('click', () => {
            controls.autoRotate = !controls.autoRotate;
            document.querySelectorAll('.btn-rotate').forEach(b => {
                b.innerText = `Rotacion: ${controls.autoRotate ? 'ON' : 'Off'}`;
                b.classList.toggle('active', controls.autoRotate);
            });
        });
    });

    document.querySelectorAll('.btn-reset').forEach(btn => {
        btn.addEventListener('click', () => {
            camera.position.copy(initialCamPos);
            controls.target.set(0,0,0);
            controls.update();
            
            document.querySelectorAll('.btn-reset').forEach(b => {
                b.classList.add('active'); setTimeout(() => b.classList.remove('active'), 200);
            });
        });
    });
}

function cleanMemory() {
    if (!currentModel) return;
    currentModel.traverse(child => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach(m => {
                    m.dispose();
                    if (m.map) m.map.dispose(); if (m.lightMap) m.lightMap.dispose();
                    if (m.bumpMap) m.bumpMap.dispose(); if (m.normalMap) m.normalMap.dispose();
                    if (m.specularMap) m.specularMap.dispose(); if (m.envMap) m.envMap.dispose();
                    if (m.alphaMap) m.alphaMap.dispose(); if (m.aoMap) m.aoMap.dispose();
                    if (m.displacementMap) m.displacementMap.dispose(); if (m.emissiveMap) m.emissiveMap.dispose();
                    if (m.gradientMap) m.gradientMap.dispose(); if (m.metalnessMap) m.metalnessMap.dispose();
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

    closeAllMobPanels(); // Cierra los menús móviles si estaban abiertos

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
    document.querySelectorAll('.btn-wireframe').forEach(b => {
        b.innerText = 'Wireframe: Off'; b.classList.remove('active');
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
    const dist = maxDim * 1.5;
    initialCamPos.set(dist, dist*0.8, dist);
    
    document.querySelectorAll('.btn-reset')[0].click();

    // Simula click en Desktop que aplica a todo
    document.getElementById('loader').style.display = 'none';
}

function onProgress(xhr) {
    if(xhr.lengthComputable) {
        const pct = Math.round((xhr.loaded / xhr.total) * 100);
        document.getElementById('loader-text').innerText = `CARGANDO MODELO: ${pct}%`;
    }
}

function onError(err) {
    console.error("Error FarmeX Engine:", err);
    document.getElementById('loader-text').innerText = 'ERROR DE LECTURA';
    setTimeout(() => document.getElementById('loader').style.display='none', 2500);
}

function animate() {
    requestAnimationFrame(animate);
    if(mixer) mixer.update(clock.getDelta());
    controls.update(); 
    renderer.render(scene, camera);
}

init();
