import "./stylesheet.css";
import "./porygon-sprite.png";
import porygonMeshPath from "./porygon/porygon.glb";
import backgroundPath from "./gradient.jpg";
import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

console.log("Initializing scene");

let stats;
let camera;
let renderer;
let scene = new THREE.Scene();
let container = document.getElementById("viewer");
let controls;
let loader = new GLTFLoader();
let textureLoader = new THREE.TextureLoader();
let porygon;
let rightFoot;
let tail;
let head;
let leftFoot;
let endWaist;

function init() {
    stats = Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    
    camera = new THREE.PerspectiveCamera(50, getWidth() / getHeight(), 1, 75);
    camera.position.set(-3, 2.9, 3.5);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor( 0x000000, 0.0 );
    renderer.setSize(getWidth(), getHeight());
    
    container.appendChild(stats.dom);
    container.appendChild(renderer.domElement);
    
    controls = new OrbitControls(camera, renderer.domElement);
    const TARGET_Y = 0.3;
    camera.lookAt(new THREE.Vector3(0, TARGET_Y, 0));
    controls.target.set(0, TARGET_Y, 0);

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

    textureLoader.load(backgroundPath, function(t) {
        scene.background = t;
    });

    loadPorygon();

    window.addEventListener("resize", renderer.onResize, false);
    animate();
}

function loadPorygon() {
    // Load a glTF resource
    loader.load(
        // resource URL
        porygonMeshPath,
        // called when the resource is loaded
        function ( gltf ) {
            scene.add( gltf.scene );

            porygon = gltf.scene;

            gltf.scene.traverse(function ( child ) {
                if (child instanceof THREE.Mesh) {
                    console.log(child.name);
                }
            });

            // console.log(gltf);

            let armature = gltf.scene.children[0];
            let pm0137_00 = armature.children[0];
            let origin = pm0137_00.children[0];
            let waist = origin.children[0];

            console.log(waist.children);

            rightFoot = waist.children[0];
            tail = waist.children[1];
            head = waist.children[2];
            leftFoot = waist.children[3];
            endWaist = waist.children[4];

            gltf.animations; // Array<THREE.AnimationClip>
            gltf.scene; // THREE.Group
            gltf.scenes; // Array<THREE.Group>
            gltf.cameras; // Array<THREE.Camera>
            gltf.asset; // Object
        },
        // called while loading is progressing
        function ( xhr ) {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        function ( error ) {
            console.log( 'An error happened' );
        }
    );
}

function animate() {
    stats.begin();
    animatePorygon();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    stats.end();
}

function animatePorygon() {
    let milliseconds = Date.now();
    if (tail) {
        const RANGE = Math.PI * 0.1;
        const ORIGIN = 0.855842168538818
        tail.rotation.y  = Math.sin(milliseconds * 0.015) * RANGE + ORIGIN;
    }
    if (leftFoot) {
        leftFoot.rotation.z = Math.sin(milliseconds * 0.01) * Math.PI * 0.1;
    }
    if (rightFoot) {
        rightFoot.rotation.z = Math.sin(milliseconds * 0.01) * Math.PI * 0.1 + Math.PI;
    }
    if (head) {
        const ORIGIN = -0.3530296061149312;
        head.rotation.y  = Math.sin(milliseconds * 0.01) * Math.PI * 0.015 + ORIGIN;
    }
    if (porygon) {
        porygon.position.set(0, Math.sin(milliseconds * 0.0045) * Math.PI * 0.03, 0);
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
    renderer.setSize(getWidth(), getHeight());
}

init();