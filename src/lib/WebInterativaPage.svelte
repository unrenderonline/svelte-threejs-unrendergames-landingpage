<script>
  import { onMount } from "svelte";
  import * as THREE from "three";
  import Spinner from "./Spinner.svelte";

  let canvas;
  let scene, camera, renderer;
  let section1Mesh, section2Mesh, section3Mesh;
  let lensMesh;
  let p5Plane;
  let mouse = new THREE.Vector2();
  let targetPos = new THREE.Vector3(0, 0, 2);
  let isLoading = true;
  let scrollCleanup;
  let p5Instance;

  // Scroll progress (0 to 1)
  let scrollProgress = 0;

  // Clipping plane for 3D reveal (Left to Right)
  const revealPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -5);

  onMount(async () => {
    document.body.style.overflowX = "hidden";

    await initP5();
    initScene();
    await setupScrollAnimations();
    animate();

    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (renderer) {
        renderer.dispose();
      }
      if (p5Instance) {
        p5Instance.remove();
      }
      if (scrollCleanup) scrollCleanup();
      document.body.style.overflowX = "";
    };
  });

  async function initP5() {
    let p5;
    try {
      const p5Module = await import("p5");
      p5 = p5Module.default || p5Module;
    } catch (e) {
      console.error("Failed to load p5", e);
      return;
    }

    const sketch = (p) => {
      let _backLayer;
      let _midLayer;
      let _frontLayer;
      let _colorSet;

      let lineDensity = 0.8;
      let dotDensity = 0.8;
      let stickDotDensity = 0.8;

      let curvesIn = [];
      let curvesOut = [];
      let colorSets = [];

      p.setup = async () => {
        const canvasRenderer = p.createCanvas(2048, 1024);
        p.noLoop();

        // Hide and expose canvas
        canvasRenderer.elt.style.display = "none";
        p.customCanvasElement = canvasRenderer.elt;

        // Initialize Easing Functions and Arrays
        initCurves();
        initColorSets();

        _backLayer = p.createGraphics(p.width, p.height);
        _midLayer = p.createGraphics(p.width, p.height);
        _frontLayer = p.createGraphics(p.width, p.height);

        _backLayer.colorMode(p.HSB);
        _midLayer.colorMode(p.HSB);
        _frontLayer.colorMode(p.HSB);
        p.colorMode(p.HSB);

        // get color
        _colorSet = GetColorSet();
        _backLayer.background(
          _colorSet.bgColor.h,
          _colorSet.bgColor.s,
          _colorSet.bgColor.b,
        );

        let padding = 0.15 * p.min(p.width, p.height);

        // bg part
        let baseHeight = padding + 0.85 * (p.height - 2 * padding);

        let bgHeight = 0.06 * p.height;
        let xCount = p.width * p.random(0.6, 1.2);

        for (let x = 0; x < xCount; x++) {
          let yDotCount = bgHeight * dotDensity * 0.6;

          for (let y = 0; y < yDotCount; y++) {
            let t = p.tan(p.random(p.TWO_PI));

            let nowX = x * (p.width / (xCount - 1));
            let nowY = baseHeight - bgHeight * t - 0.2 * p.height;

            _backLayer.noFill();
            _backLayer.stroke(
              _colorSet.bgDotColor.h,
              _colorSet.bgDotColor.s,
              _colorSet.bgDotColor.b,
            );
            _backLayer.circle(nowX, nowY, p.random(0, 2));
          }
        }

        let potCount = p.int(p.random(6, 18));
        let potWidth = (p.width - padding * 2) / potCount;

        for (let i = 0; i < potCount; i++) {
          let potX = padding + (i + 0.5) * potWidth;
          let potY = baseHeight;

          let potHeight = p.random(0.4, 2.0) * potWidth;
          let newPot = new PotData(potX, potY, potWidth / 2, potHeight);

          await drawPot(newPot);
        }

        // Force a redraw to update texture
        p.redraw();
      };

      p.draw = () => {
        // Clear main canvas
        p.background(0, 0, 100);

        // Calculate visible width based on scrollProgress
        let visibleWidth = p.width * scrollProgress;

        if (visibleWidth > 0) {
          const drawLayer = (layer) => {
            if (!layer) return;
            // Try to find the underlying canvas element
            const drawable = layer.elt || layer.canvas || layer;

            try {
              if (drawable) {
                p.image(
                  drawable,
                  0,
                  0,
                  visibleWidth,
                  p.height,
                  0,
                  0,
                  visibleWidth,
                  p.height,
                );
              }
            } catch (e) {
              // Silent fail or minimal log to avoid spam
              // console.warn("Layer draw failed", e);
            }
          };

          drawLayer(_backLayer);
          drawLayer(_midLayer);
          drawLayer(_frontLayer);
        }
      };

      // --- Classes ---
      class PotData {
        constructor(_x, _y, _potWidth, _potHeight) {
          this.x = _x;
          this.y = _y;
          this.edgePoints = [];
          this.edgePointCount = p.int(p.random(3, 12));

          for (let i = 0; i < this.edgePointCount; i++) {
            let pointX = p.random(0.3, 1.0) * _potWidth;
            let pointY = _potHeight * (i / (this.edgePointCount - 1));

            this.edgePoints.push({ x: pointX, y: pointY });
          }
        }
      }

      class StickObj {
        constructor(_x, _y, _startDir, _stickLength) {
          this.x = _x;
          this.y = _y;

          this.nodes = [];
          this.nodeCount = 6;

          let segmentAvgLength = _stickLength / this.nodeCount;

          this.nodes = getStick(
            _x,
            _y,
            _startDir,
            segmentAvgLength,
            this.nodeCount,
          );
        }
      }

      class NYColor {
        constructor(_h, _s, _b, _a = 1.0) {
          this.h = _h;
          this.s = _s;
          this.b = _b;
          this.a = _a;
        }
      }

      // --- Drawing Functions ---
      async function drawPot(_potData) {
        let startX = _potData.x;
        let startY = _potData.y;
        let edgePoints = _potData.edgePoints;

        let edgeCurves = [];
        let isOutCurve = p.random() < 0.5;

        for (let i = 0; i < edgePoints.length - 1; i++) {
          if (isOutCurve)
            edgeCurves.push(curvesOut[p.int(p.random(curvesOut.length))]);
          else edgeCurves.push(curvesIn[p.int(p.random(curvesIn.length))]);

          isOutCurve = !isOutCurve;
        }

        // draw pot body
        for (let i = 0; i < edgePoints.length - 1; i++) {
          let nowPoint = edgePoints[i];
          let nextPoint = edgePoints[i + 1];
          let fromX = _potData.x;
          let fromY = _potData.y - nowPoint.y;
          let fromDist = nowPoint.x;
          let toX = _potData.x;
          let toY = _potData.y - nextPoint.y;
          let toDist = nextPoint.x;
          let currentCurve = edgeCurves[i];
          await drawEdgeSegment(
            fromX,
            fromY,
            fromDist,
            toX,
            toY,
            toDist,
            currentCurve,
          );
        }

        // draw edge dots
        for (let i = 0; i < edgePoints.length - 1; i++) {
          let nowPoint = edgePoints[i];
          let nextPoint = edgePoints[i + 1];
          let fromX = _potData.x;
          let fromY = _potData.y - nowPoint.y;
          let fromDist = nowPoint.x;
          let toX = _potData.x;
          let toY = _potData.y - nextPoint.y;
          let toDist = nextPoint.x;
          let currentCurve = edgeCurves[i];
          await drawSegmentDots(
            fromX,
            fromY,
            fromDist,
            toX,
            toY,
            toDist,
            currentCurve,
          );
        }

        // draw stick
        let baseAngleT = p.random(0.6, 0.8);
        let endAngleT = p.random(0.2, 0.4);

        if (p.random() < 0.5) {
          baseAngleT = p.random(0.2, 0.4);
          endAngleT = p.random(0.6, 0.8);
        }

        let baseRadius = edgePoints[0].x;
        let endRadius = edgePoints[edgePoints.length - 1].x;
        let endYOffset = edgePoints[edgePoints.length - 1].y;

        let baseX =
          startX + baseRadius * p.sin(p.radians(p.lerp(90, 270, baseAngleT)));
        let baseY =
          startY +
          baseRadius * 0.24 * -p.cos(p.radians(p.lerp(90, 270, baseAngleT)));

        let endX =
          startX + endRadius * p.sin(p.radians(p.lerp(90, 270, endAngleT)));
        let endY =
          startY -
          endYOffset +
          endRadius * 0.24 * -p.cos(p.radians(p.lerp(90, 270, endAngleT)));

        if (p.random() < 0.6) {
          let stickAngle = getAngle(baseX, baseY, endX, endY);
          let stickX = p.lerp(baseX, endX, 0.9);
          let stickY = p.lerp(baseY, endY, 0.9);
          let stickLength = p.random(1.6, 3.0) * endYOffset;

          let newStickObj = new StickObj(
            stickX,
            stickY,
            stickAngle,
            stickLength,
          );
          await drawStick(newStickObj);
        }
      }

      async function drawEdgeSegment(
        _fromX,
        _fromY,
        _fromDist,
        _toX,
        _toY,
        _toDist,
        _curveFunc,
      ) {
        let lineCount = lineDensity * p.dist(_fromX, _fromY, _toX, _toY);

        for (let i = 0; i < lineCount; i++) {
          let t = i / lineCount;
          let curveT = _curveFunc(t);

          let centerX = p.lerp(_fromX, _toX, t);
          let centerY = p.lerp(_fromY, _toY, t);

          let nowDist = p.lerp(_fromDist, _toDist, curveT);

          let leftX = centerX - nowDist;
          let leftY = centerY;

          let rightX = centerX + nowDist;
          let rightY = centerY;

          let nowColor = _colorSet.potStrokeColorA;
          drawCurveLine(
            leftX,
            leftY,
            rightX,
            rightY,
            p.abs(leftX - rightX) * 0.24,
            nowColor,
            12,
          );

          nowColor = _colorSet.potInsideColorA;
          drawCurveLine(
            leftX,
            leftY,
            rightX,
            rightY,
            p.abs(leftX - rightX) * 0.24,
            nowColor,
            3,
          );
        }
      }

      function drawCurveLine(
        _x1,
        _y1,
        _x2,
        _y2,
        _curveHeight,
        _dotColor,
        _thickness,
      ) {
        let centerX = (_x1 + _x2) / 2;
        let centerY = (_y1 + _y2) / 2;

        let r1 = p.abs(_x2 - _x1) / 2;
        let r2 = _curveHeight;
        let ellipseRadius = 2 * p.PI * p.sqrt((r1 * r1 + r2 * r2) / 2);

        let dotCount = p.int(ellipseRadius * dotDensity);

        let fromAngle = 0;
        let toAngle = 360;

        let targetLayer = _backLayer;

        for (let i = 0; i < dotCount; i++) {
          let t = i / (dotCount - 1);
          let nowAngle = p.lerp(fromAngle, toAngle, t);
          let briAddRatio = p.sin(p.radians(p.lerp(0, 180, t)));

          let x = centerX + r1 * p.sin(p.radians(nowAngle));
          let y = centerY + r2 * -p.cos(p.radians(nowAngle));

          let dotSize =
            p.noise(centerX, centerY, nowAngle * 0.1) * _thickness + 2;

          if (nowAngle > 90 && nowAngle < 270) targetLayer = _frontLayer;
          else targetLayer = _backLayer;

          targetLayer.noStroke();
          targetLayer.fill(
            _dotColor.h,
            _dotColor.s,
            _dotColor.b + briAddRatio * 20,
          );
          targetLayer.circle(x, y, dotSize);
        }
      }

      async function drawSegmentDots(
        _fromX,
        _fromY,
        _fromDist,
        _toX,
        _toY,
        _toDist,
        _curveFunc,
      ) {
        let lineCount = lineDensity * p.dist(_fromX, _fromY, _toX, _toY);

        for (let i = 0; i < lineCount; i++) {
          let t = i / lineCount;
          let curveT = _curveFunc(t);

          let centerX = p.lerp(_fromX, _toX, t);
          let centerY = p.lerp(_fromY, _toY, t);

          let nowDist = p.lerp(_fromDist, _toDist, curveT);

          let leftX = centerX - nowDist;
          let leftY = centerY;

          let rightX = centerX + nowDist;
          let rightY = centerY;

          let nowColor = _colorSet.potEdgeDotColor;
          drawCurveLineDots(
            leftX,
            leftY,
            rightX,
            rightY,
            p.abs(leftX - rightX) * 0.24,
            nowColor,
            1,
          );
        }
      }

      function drawCurveLineDots(
        _x1,
        _y1,
        _x2,
        _y2,
        _curveHeight,
        _dotColor,
        _thickness,
      ) {
        let centerX = (_x1 + _x2) / 2;
        let centerY = (_y1 + _y2) / 2;

        let r1 = p.abs(_x2 - _x1) / 2;
        let r2 = _curveHeight;

        let dotCount = 100;
        let fromAngle = 90;
        let toAngle = 270;
        let targetLayer = _frontLayer;

        for (let i = 0; i < dotCount; i++) {
          let t = 1 - p.random(p.random(p.random()));
          let nowAngle = p.lerp(fromAngle, toAngle, t);

          let x = centerX + r1 * p.sin(p.radians(nowAngle));
          let y = centerY + r2 * -p.cos(p.radians(nowAngle));

          let dotSize =
            p.noise(centerX, centerY, nowAngle * 0.1) * _thickness + 1;

          targetLayer.noStroke();
          targetLayer.fill(_dotColor.h, _dotColor.s, _dotColor.b);
          targetLayer.circle(x, y, dotSize);
        }
      }

      async function drawStick(_stickObj) {
        let hasFlower = p.random() < 0.5;

        for (let i = 0; i < _stickObj.nodes.length; i++) {
          let nodeData = _stickObj.nodes[i];
          _midLayer.noStroke();
          _midLayer.fill(
            _colorSet.stickColor.h,
            _colorSet.stickColor.s,
            _colorSet.stickColor.b,
          );

          let nowThickness = 3;
          if (nodeData.nodeDepth <= 2) {
            nowThickness = 2;
          }
          drawStickBranch(
            nodeData.x1,
            nodeData.y1,
            nodeData.x2,
            nodeData.y2,
            nowThickness,
          );

          if (nodeData.nodeDepth <= 3 && hasFlower) drawDottedFlowers(nodeData);
        }
      }

      function drawStickBranch(_x1, _y1, _x2, _y2, _thickness) {
        let dotCount = p.dist(_x1, _y1, _x2, _y2) * stickDotDensity;

        for (let i = 0; i < dotCount; i++) {
          let t = i / (dotCount - 1);
          let nowX = p.lerp(_x1, _x2, t);
          let nowY = p.lerp(_y1, _y2, t);

          let normalAngle = getAngle(_x1, _y1, _x2, _y2) + 90;

          nowX +=
            p.sin(p.radians(normalAngle)) *
            p.noise(nowX * 0.1, nowY * 0.1, 666.0) *
            _thickness;
          nowY -=
            p.cos(p.radians(normalAngle)) *
            p.noise(nowX * 0.1, nowY * 0.1, 999.0) *
            _thickness;

          let dotSize =
            p.noise(nowX * 0.6, nowY * 0.6) * _thickness + _thickness * 0.5;
          _midLayer.circle(nowX, nowY, dotSize);
        }
      }

      function drawDottedFlowers(_node) {
        let flowerDotCount = p.int(p.random(0, 6));

        for (let i = 0; i < flowerDotCount; i++) {
          let xPos = p.lerp(_node.x1, _node.x2, p.random());
          let yPos = p.lerp(_node.y1, _node.y2, p.random());

          xPos += p.random() * 60 - 30;
          yPos += p.random() * 60 - 30;

          let dotSize = p.random(0.1, 6);

          _midLayer.noStroke();
          _midLayer.fill(
            _colorSet.flowerColor.h,
            _colorSet.flowerColor.s,
            _colorSet.flowerColor.b,
          );
          _midLayer.circle(xPos, yPos, dotSize);
        }
      }

      function getStick(_x, _y, _dir, _length, _maxNodeDepth) {
        let fromX = _x;
        let fromY = _y;

        let toX = fromX + _length * p.sin(p.radians(_dir));
        let toY = fromY + _length * -p.cos(p.radians(_dir));

        let nodes = [];
        nodes.push({
          x1: fromX,
          y1: fromY,
          x2: toX,
          y2: toY,
          dir: _dir,
          length: _length,
          nodeDepth: _maxNodeDepth,
        });

        let splitNode = p.random() < 0.5;

        if (_maxNodeDepth > 0 && splitNode) {
          let leftMin = 0.6;
          let rightMin = 0.6;

          if (p.random() < 0.5) leftMin = 0.1;
          else rightMin = 0.1;

          let leftNodes = getStick(
            toX,
            toY,
            _dir + p.random(-20, -6),
            _length * p.random(leftMin, 0.95),
            _maxNodeDepth - 1,
          );
          let rightNodes = getStick(
            toX,
            toY,
            _dir + p.random(6, 20),
            _length * p.random(rightMin, 0.95),
            _maxNodeDepth - 1,
          );

          for (let i = 0; i < leftNodes.length; i++) nodes.push(leftNodes[i]);
          for (let i = 0; i < rightNodes.length; i++) nodes.push(rightNodes[i]);
        } else if (_maxNodeDepth > 0) {
          let newNodes = getStick(
            toX,
            toY,
            _dir + p.random(-20, 20),
            _length * p.random(0.6, 0.95),
            _maxNodeDepth - 1,
          );
          for (let i = 0; i < newNodes.length; i++) nodes.push(newNodes[i]);
        }
        return nodes;
      }

      function getAngle(_x1, _y1, _x2, _y2) {
        let xDiff = _x2 - _x1;
        let yDiff = _y2 - _y1;
        return (p.atan2(yDiff, xDiff) * 180) / p.PI + 90;
      }

      function processHue(_hue) {
        let result = ((_hue % 360) + 360) % 360;
        return result;
      }

      function GetColorSet() {
        let blueSet = {
          bgColor: new NYColor(0, 0, 92),
          bgDotColor: new NYColor(200, 20, 80),
          stickColor: new NYColor(0, 0, 20),
          potStrokeColorA: new NYColor(200, 30, 30),
          potInsideColorA: new NYColor(200, 6, 80),
          potEdgeDotColor: new NYColor(200, 6, 80),
          flowerColor: new NYColor(0, 0, 100),
        };

        let sakuraSet = {
          bgColor: new NYColor(330, 28, 90),
          bgDotColor: new NYColor(346, 28, 80),
          stickColor: new NYColor(0, 0, 20),
          potStrokeColorA: new NYColor(346, 30, 30),
          potInsideColorA: new NYColor(342, 8, 90),
          potEdgeDotColor: new NYColor(350, 30, 90),
          flowerColor: new NYColor(0, 0, 100),
        };

        let greenSet = {
          bgColor: new NYColor(0, 0, 90),
          bgDotColor: new NYColor(0, 0, 80),
          stickColor: new NYColor(0, 0, 20),
          potStrokeColorA: new NYColor(174, 42, 40),
          potInsideColorA: new NYColor(95, 40, 100),
          potEdgeDotColor: new NYColor(95, 10, 95),
          flowerColor: new NYColor(40, 100, 100),
        };

        let devilSet = {
          bgColor: new NYColor(0, 20, 12),
          bgDotColor: new NYColor(0, 0, 24),
          stickColor: new NYColor(0, 0, 100),
          potStrokeColorA: new NYColor(342, 100, 60),
          potInsideColorA: new NYColor(320, 40, 80),
          potEdgeDotColor: new NYColor(340, 40, 20),
          flowerColor: new NYColor(60, 80, 100),
        };

        let zenSet = {
          bgColor: new NYColor(0, 0, 80),
          bgDotColor: new NYColor(0, 0, 90),
          stickColor: new NYColor(0, 0, 40),
          potStrokeColorA: new NYColor(0, 0, 50),
          potInsideColorA: new NYColor(0, 0, 80),
          potEdgeDotColor: new NYColor(0, 0, 60),
          flowerColor: new NYColor(350, 40, 100),
        };

        colorSets = [blueSet, sakuraSet, greenSet, devilSet, zenSet];
        return colorSets[p.int(p.random(0, colorSets.length))];
      }

      function initCurves() {
        curvesIn = [
          (x) => 1 - Math.cos((x * Math.PI) / 2), // easeInSine
          (x) => x * x, // easeInQuad
          (x) => x * x * x, // easeInCubic
          (x) => x * x * x * x, // easeInQuart
          (x) => x * x * x * x * x, // easeInQuint
          (x) => (x === 0 ? 0 : Math.pow(2, 10 * x - 10)), // easeInExpo
          (x) => 1 - Math.sqrt(1 - Math.pow(x, 2)), // easeInCirc
          (x) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return c3 * x * x * x - c1 * x * x;
          }, // easeInBack
        ];

        curvesOut = [
          (x) => Math.sin((x * Math.PI) / 2), // easeOutSine
          (x) => 1 - (1 - x) * (1 - x), // easeOutQuad
          (x) => 1 - Math.pow(1 - x, 3), // easeOutCubic
          (x) => 1 - Math.pow(1 - x, 4), // easeOutQuart
          (x) => 1 - Math.pow(1 - x, 5), // easeOutQuint
          (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)), // easeOutExpo
          (x) => Math.sqrt(1 - Math.pow(x - 1, 2)), // easeOutCirc
          (x) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
          }, // easeOutBack
        ];
      }

      function initColorSets() {
        // Placeholder if needed
      }
    };

    p5Instance = new p5(sketch);
  }

  function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f1e);

    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.localClippingEnabled = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // --- 3D Models (Top Half) ---
    const torusGeometry = new THREE.TorusGeometry(0.8, 0.3, 16, 100);
    const torusMaterial = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      metalness: 0.7,
      roughness: 0.2,
      clippingPlanes: [revealPlane],
    });
    section1Mesh = new THREE.Mesh(torusGeometry, torusMaterial);
    section1Mesh.position.set(-2, 1.5, 0);
    scene.add(section1Mesh);

    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b9d,
      wireframe: true,
      clippingPlanes: [revealPlane],
    });
    section2Mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    section2Mesh.position.set(0, 1.5, 0);
    scene.add(section2Mesh);

    const dodecaGeometry = new THREE.DodecahedronGeometry(1);
    const dodecaMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.1,
      clippingPlanes: [revealPlane],
    });
    section3Mesh = new THREE.Mesh(dodecaGeometry, dodecaMaterial);
    section3Mesh.position.set(2, 1.5, 0);
    scene.add(section3Mesh);

    // --- p5.js Plane (Bottom Half) ---
    if (p5Instance && p5Instance.customCanvasElement) {
      const texture = new THREE.CanvasTexture(p5Instance.customCanvasElement);
      const planeGeometry = new THREE.PlaneGeometry(8, 4);
      const planeMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      });
      p5Plane = new THREE.Mesh(planeGeometry, planeMaterial);
      p5Plane.position.set(0, -2, -1);
      scene.add(p5Plane);
    }

    // --- Lens (Zoom Glass) ---
    const lensGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    lensGeometry.scale(1, 1, 0.3);
    const lensMaterial = new THREE.MeshPhysicalMaterial({
      transmission: 1,
      opacity: 1,
      roughness: 0,
      ior: 1.5,
      thickness: 2,
      clearcoat: 1,
      clearcoatRoughness: 0,
      side: THREE.DoubleSide,
    });
    lensMesh = new THREE.Mesh(lensGeometry, lensMaterial);
    lensMesh.position.set(0, 0, 2);
    scene.add(lensMesh);

    window.addEventListener("resize", onWindowResize);
    isLoading = false;
  }

  function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = (2 - camera.position.z) / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    targetPos.copy(pos);
  }

  async function setupScrollAnimations() {
    try {
      const gsapModule = await import("gsap");
      const gsap = gsapModule.gsap || gsapModule.default || gsapModule;
      const stModule = await import("gsap/ScrollTrigger");
      const ScrollTrigger =
        stModule.ScrollTrigger || stModule.default || stModule;
      gsap.registerPlugin(ScrollTrigger);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".scroll-container",
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          onUpdate: (self) => {
            scrollProgress = self.progress;
            if (p5Instance) {
              p5Instance.redraw();
              if (p5Plane && p5Plane.material.map) {
                p5Plane.material.map.needsUpdate = true;
              }
            }

            // Update Clipping Plane
            revealPlane.constant = scrollProgress * 10 - 5;
          },
        },
      });
    } catch (e) {
      console.warn("GSAP error", e);
    }
  }

  function animate() {
    requestAnimationFrame(animate);

    if (section1Mesh) section1Mesh.rotation.z += 0.005;
    if (section2Mesh) section2Mesh.rotation.y += 0.01;
    if (section3Mesh) section3Mesh.rotation.z += 0.005;

    if (lensMesh) lensMesh.position.lerp(targetPos, 0.1);

    renderer.render(scene, camera);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
</script>

{#if isLoading}
  <Spinner />
{/if}

<div class="scroll-container">
  <div class="scroll-spacer"></div>
</div>

<div class="page-container">
  <canvas bind:this={canvas} class="fixed-canvas"></canvas>

  <div class="overlay-content">
    <h1>Web Interativa</h1>
  </div>

  <div class="scroll-fab">
    <p>
      Rolar para baixo <i
        class="fa-solid fa-arrow-down"
        style="margin-left: 0.5rem;"
      ></i>
    </p>
  </div>
</div>

<style>
  .page-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: #0f0f1e;
  }

  .fixed-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  .scroll-container {
    position: relative;
    width: 100%;
    height: 400vh;
    z-index: 0;
    pointer-events: none;
  }

  .overlay-content {
    position: absolute;
    top: 5%;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    color: white;
    z-index: 2;
    pointer-events: none;
  }

  .scroll-fab {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    color: white;
    z-index: 100;
    pointer-events: none;
    animation: bounce 2s infinite;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 0.8rem 1.5rem;
    border-radius: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  @keyframes bounce {
    0%,
    20%,
    50%,
    80%,
    100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-10px);
    }
    60% {
      transform: translateY(-5px);
    }
  }

  h1 {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #00d4ff 0%, #ff6b9d 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
</style>
