import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
// scene.background = new THREE.Color('#')

/**
 * Lights
 */
// Ambient light
const ambientLight = new THREE.AmbientLight('#ffffff', 0.5)
scene.add(ambientLight)

// Directional light
const directionalLight = new THREE.DirectionalLight('#ffffff', 1.5)
directionalLight.position.set(-3, 2, 8)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 0
camera.position.y = 0
camera.position.z = 10
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.minDistance = 5
controls.maxDistance = 20
controls.maxPolarAngle = Math.PI / 2 // 수직 회전 각도 제한 (90도)
controls.minPolarAngle = Math.PI / 4 // 최소 수직 회전 각도 (45도)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const timer = new Timer()

/**
 * Image-based Cube Generation (Step 1)
 */
/**
 * Step 1: 정적 이미지 → 픽셀 → 큐브로 변환
 */
const image = new Image()
image.src = '/img/island.png' // <- 정적 폴더 기준 경로
image.crossOrigin = 'anonymous' // CORS 회피 (필요시)

image.onload = () => {
    const canvas2D = document.createElement('canvas')
    const context = canvas2D.getContext('2d')
    const width = image.width
    const height = image.height
    canvas2D.width = width
    canvas2D.height = height
    context.drawImage(image, 0, 0, width, height)

    const imageData = context.getImageData(0, 0, width, height)
    const data = imageData.data

    // 100x100 그리드로 변환
    const gridSize = 100
    const cubeSize = 0.15
    const depthRange = 8.0
    const spacing = 0.08

    // 큐브들을 저장할 배열
    const cubes = []
    let isScattered = false
    const animationSpeed = 0.1 // 애니메이션 속도 (0~1)

    // 이미지의 가로세로 비율 유지
    const aspectRatio = width / height
    const gridWidth = gridSize
    const gridHeight = Math.floor(gridSize / aspectRatio)

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            // 원본 이미지의 해당 위치 색상 가져오기
            const originalX = Math.floor((x / gridWidth) * width)
            const originalY = Math.floor((y / gridHeight) * height)
            const index = (originalY * width + originalX) * 4
            const r = data[index]
            const g = data[index + 1]
            const b = data[index + 2]
            const a = data[index + 3]

            if (a < 128) continue // 투명한 픽셀 제외

            const color = new THREE.Color(`rgb(${r},${g},${b})`)
            const cube = new THREE.Mesh(
                new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
                new THREE.MeshStandardMaterial({ color: color })
            )

            // 초기 위치 설정 (z=0)
            cube.position.x = (x - gridWidth / 2) * spacing
            cube.position.y = -(y - gridHeight / 2) * spacing
            cube.position.z = 0

            scene.add(cube)

            // 각 큐브의 초기 위치와 목표 위치 저장
            cube.userData = {
                targetZ: 0
            }
            cubes.push(cube)
        }
    }

    /**
     * Water Surface (Ocean)
     */
    const waterTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg')
    waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping
    waterTexture.repeat.set(10, 10)

    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x4060ff,
        metalness: 0.3,
        roughness: 0.2,
        normalMap: waterTexture,
        transparent: true,
        opacity: 0.9
    })

    const waterGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100)
    const water = new THREE.Mesh(waterGeometry, waterMaterial)
    water.rotation.x = -Math.PI / 2
    water.position.y = -4
    scene.add(water)

    // 클릭 이벤트 수정
    window.addEventListener('click', () => {
        isScattered = !isScattered

        cubes.forEach(cube => {
            // 목표 위치 업데이트
            cube.userData.targetZ = isScattered ? (Math.random() - 0.5) * depthRange : 0
        })
    })

    // 애니메이션을 위한 tick 함수 수정
    const tick = () => {
        // Timer
        timer.update()
        const elapsedTime = timer.getElapsed()

        // Update controls
        controls.update()
        waterTexture.offset.y += 0.0005

        // 큐브 애니메이션 업데이트
        cubes.forEach(cube => {
            // 현재 위치에서 목표 위치로 부드럽게 이동
            cube.position.z = THREE.MathUtils.lerp(
                cube.position.z,
                cube.userData.targetZ,
                animationSpeed
            )
        })

        // Render
        renderer.render(scene, camera)

        // Call tick again on the next frame
        window.requestAnimationFrame(tick)
    }

    tick()
}