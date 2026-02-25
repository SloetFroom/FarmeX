# 🌾 FarmeX - Visor 3D Profesional

Plataforma profesional para inspección geométrica y visualización de modelos 3D, orientada a soluciones agrícolas.

## 🚀 Características

- **Visor 3D interactivo** con soporte para múltiples formatos
- **Análisis geométrico** con conteo de polígonos y vértices
- **Controles avanzados** de iluminación y visualización
- **Soporte de múltiples formatos**: GLB, GLTF, FBX, OBJ, STL
- **Interfaz moderna y responsive** con tema claro/oscuro
- **Estadísticas en tiempo real** del modelo cargado

## 📋 Formatos Soportados

| Formato | Descripción | Recomendado |
|---------|-------------|------------|
| GLB | glTF Binary (glTF 2.0) | ✅ Recomendado |
| GLTF | glTF Text Format | ✓ Compatible |
| FBX | Autodesk Filmbox | ✓ Compatible |
| OBJ | Wavefront | ✓ Compatible |
| STL | Stereolithography | ✓ Compatible |

## 🎮 Controles

### Mouse
- **Botón izquierdo + arrastrar**: Rotar vista
- **Rueda del ratón**: Zoom in/out
- **Botón derecho + arrastrar**: Desplazar vista

## 📊 Estadísticas del Modelo

El visor muestra automáticamente:
- Formato del archivo
- Tamaño del archivo
- Cantidad de vértices
- Cantidad de triángulos
- Número de materiales
- Número de texturas

## 🛠️ Tecnologías

- **Three.js 0.146.0**: Motor de renderizado 3D
- **HTML5 & CSS3**: Estructura y estilos
- **JavaScript Vanilla**: Lógica de aplicación

## 📥 Instalación Local

1. Clona el repositorio:
```bash
git clone https://github.com/SloetFroom/FarmeX.git
cd FarmeX
```

2. Abre `index.html` en tu navegador (requiere servidor local)

3. O usa un servidor local:
```bash
python -m http.server 8000
```

Luego accede a `http://localhost:8000`

## 🌐 Uso en Línea

👉 **GitHub Pages**: [Abre FarmeX aquí](https://SloetFroom.github.io/FarmeX/)

## 📝 Estructura

```
FarmeX/
├── index.html
├── Js/app.js
├── styles/main.css
└── README.md
```

## 📄 Licencia

MIT License 2026