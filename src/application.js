import "./stylesheet.css";
import porygonMeshPath from "./assets/porygon.glb";
import backgroundPath from "./assets/gradient.jpg";

import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import * as HoloPlay from './libraries/holoplay.module.mjs';

console.log("Initializing scene");

let stats;
let camera;
let renderer;
let scene = new THREE.Scene();
let container = document.getElementById("viewer");
let controls;
let loader = new GLTFLoader();
let textureLoader = new THREE.TextureLoader();
let lookingGlass = true;
let porygon;
let rightFoot;
let tail;
let head;
let leftFoot;
let endWaist;

function init() {
    // Modified HoloPlay.js to add this function
    HoloPlay.detectDevice((devices) => {
        lookingGlass = devices.length > 0;
        if (!lookingGlass) {
            console.log("No HoloPlay devices found");
            stats = Stats();
            stats.showPanel(0);
            container.appendChild(stats.dom);
        }
        initRendering();
    });
}

function initRendering() {
    if (lookingGlass) {
        renderer = new HoloPlay.Renderer({tileCount: new THREE.Vector2(10, 18), quiltResolution: 4096 * 1.5});
    } else {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor( 0x000000, 0.0 );
        renderer.setSize(getWidth(), getHeight());
    }
    container.appendChild(renderer.domElement);

    if (lookingGlass) {
        camera = new HoloPlay.Camera();
        const DIST = 3.5;
        camera.position.set(-3.2 * DIST, 1.8 * DIST, 4.2 * DIST);
    } else {
        camera = new THREE.PerspectiveCamera(50, getWidth() / getHeight(), 1, 75);
        camera.position.set(-3, 2.8, 3.5);
    }
    controls = new OrbitControls(camera, renderer.domElement);

    const TARGET_Y = lookingGlass ? 1 : 0.3;
    camera.lookAt(new THREE.Vector3(-0.15, TARGET_Y, 0));
    controls.target.set(0, TARGET_Y, 0);
    
    loadScene();
    loadPorygon();

    window.addEventListener("resize", onResize, false);
    animate();
}

function loadScene() {
    const light = new THREE.AmbientLight( 0xffffff, 2 ); // soft white light
    scene.add( light );

    const light2 = new THREE.PointLight( 0xff00ae, 5, 100 );
    light2.position.set( 10, -50, 50 );
    scene.add( light2 );

    const sphereSize = 1;
    const pointLightHelper2 = new THREE.PointLightHelper( light2, sphereSize );
    scene.add( pointLightHelper2 );

    const light3 = new THREE.PointLight( 0x7F00FF, 2, 100 );
    light3.position.set( -50, 50, 50 );
    scene.add( light3 );

    const pointLightHelper3 = new THREE.PointLightHelper( light3, sphereSize );
    scene.add( pointLightHelper3 );

    const size = 250;
    const divisions = 130;

    const gridHelper = new THREE.GridHelper( size, divisions, 0xF62E97, 0xF62E97 );
    scene.add( gridHelper );

    textureLoader.load(backgroundPath, function(texture) {
        scene.background = texture;
    });
}

function loadPorygon() {
    loader.load(
        porygonMeshPath,
        function (gltf) {
            porygon = gltf.scene;
            rightFoot = porygon.getObjectByName("RFoot");
            tail = porygon.getObjectByName("Tail");
            head = porygon.getObjectByName("Head");
            leftFoot = porygon.getObjectByName("LFoot");
            endWaist = porygon.getObjectByName("EndWaist");
            scene.add(porygon);
        },
        function (xhr) {
            // console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        function (error) {
            console.error(error);
        }
    );
}

function animate() {
    if (stats) {
        stats.begin();
    }
    requestAnimationFrame(animate);
    animatePorygon();
    renderer.render(scene, camera);
    if (stats) {
        stats.end();
    }
}

function animatePorygon() {
    let milliseconds = Date.now();
    if (tail) {
        const RANGE = Math.PI * 0.1;
        const ORIGIN = 0.855842168538818
        tail.rotation.y  = Math.sin(milliseconds * 0.01) * RANGE + ORIGIN;
    }
    if (leftFoot) {
        leftFoot.rotation.z = Math.sin(milliseconds * 0.005) * Math.PI * 0.1;
    }
    if (rightFoot) {
        rightFoot.rotation.z = Math.sin(milliseconds * 0.005) * Math.PI * 0.1 + Math.PI;
    }
    if (head) {
        const ORIGIN = -0.3530296061149312;
        // head.rotation.y  = Math.sin(milliseconds * 0.01) * Math.PI * 0.015 + ORIGIN;
    }
    if (porygon) {
        porygon.position.set(0, Math.sin(milliseconds * 0.0045) * Math.PI * 0.03 + 0.1, 0);
    }
}

function getWidth() {
    return container.offsetWidth;
}

function getHeight() {
    return container.offsetHeight;
}

function onResize() {
    camera.aspect = getWidth() / getHeight();
    camera.updateProjectionMatrix();
    if (!lookingGlass) {
        renderer.setSize(getWidth(), getHeight());
    }
}

init();