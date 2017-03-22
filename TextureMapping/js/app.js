/**3D-Viewport
*@author  Jarek Sarbiewski
*/
var View3D = (function () {
    /** Konstruktor
    *@param  target        Ein HTML-DIV-Element indem die 3D-Darstellung gezeichnet werden soll
    *@param  object3DMode  Das anzuzeigende 3D-Object {"triangle", "cube"}
    *@param  magFilter     Magnification-Filter {"nearest", "linear"}
    *@param  minFilter     Minification-Filter {"nearest", "linear", "nmmn", "nmml", "lmmn", "lmml"}
    *@param  anisotropic   Anisotropic-Filter {0, 2, 4, 8, 16}. 0=off
    */
    function View3D(target, object3DMode, magFilter, minFilter, anisotropic) {
        var _this = this;
        this.isMouseDown = false;
        this.mouseDownPos = { x: 0, y: 0 };
        this.camZoomPos = 60;
        this.minZoomPos = 2;
        this.maxZoomPos = 140;
        this.camY = 0;
        this.scene = new THREE.Scene();
        this.sceneOverlay = new THREE.Scene();
        this.wrapSMode = "clamp";
        this.wrapTMode = "clamp";
        this.triangleOverlay = new THREE.Object3D();
        this.triangleFace = new THREE.Object3D();
        this.cubeOverlay = new THREE.Object3D();
        this.cubeFace1 = new THREE.Object3D();
        this.cubeFace2 = new THREE.Object3D();
        this.cubeFace3 = new THREE.Object3D();
        this.cubeFace4 = new THREE.Object3D();
        this.cubeFace5 = new THREE.Object3D();
        this.cubeFace6 = new THREE.Object3D();
        this.target = target;
        this.object3DMode = object3DMode;
        this.magFilter = magFilter;
        this.minFilter = minFilter;
        this.anisotropic = anisotropic;
        this.cam = new THREE.PerspectiveCamera(50, target.clientWidth / target.clientHeight, 1, 10000);
        this.cam.position.set(0, 0, this.camZoomPos);
        this.camContainer = new THREE.Object3D();
        this.camContainer.rotation.order = "YXZ";
        this.camContainer.rotation.x = -Math.PI / 10;
        this.camContainer.rotation.y = Math.PI / 4;
        this.camContainer.position.set(0, 0, 0);
        this.camContainer.add(this.cam);
        this.scene.add(this.camContainer);
        //renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setClearColor(new THREE.Color(0xf2f2f2), 1);
        this.renderer.setSize(target.clientWidth, target.clientHeight);
        target.appendChild(this.renderer.domElement);
        //cubeRoom
        var cubeRoomMat = new THREE.MeshBasicMaterial();
        cubeRoomMat.side = THREE.BackSide;
        var cubeRoomGeom = new THREE.CubeGeometry(80, 80, 80, 1, 1, 1);
        this.cubeRoom = new THREE.Mesh(cubeRoomGeom, cubeRoomMat);
        this.cubeRoom.position.y = 25;
        this.scene.add(this.cubeRoom);
        this.textureLoader = new THREE.TextureLoader();
        this.textureLoader.crossOrigin = "Anonymous";
        this.textureLoader.load('images/calibration_tex.png', function (tex) {
            _this.cubeRoom.material = new THREE.MeshBasicMaterial({ map: tex });
            _this.cubeRoom.material.side = THREE.BackSide;
            _this.SetMagFilter(_this.magFilter, false, true, true);
            _this.SetMinFilter(_this.minFilter, false, true, true);
            _this.SetAnisotropic(_this.anisotropic, false, true, true);
        });
        //cube
        var cubeMat = new THREE.MeshBasicMaterial();
        var cubeGeom = new THREE.CubeGeometry(20, 20, 20, 1, 1, 1);
        this.cube = new THREE.Mesh(cubeGeom, cubeMat);
        this.cubeContainer = new THREE.Object3D();
        this.cubeContainer.position.y = -4.9;
        this.cubeContainer.add(this.cube);
        this.scene.add(this.cubeContainer);
        this.InitEvents();
        this.UpdateInterval();
        if (this.object3DMode == "triangle") {
            this.cube.visible = false;
            this.cubeOverlay.visible = false;
        }
        //triangle
        var triMat = new THREE.MeshBasicMaterial();
        triMat.side = THREE.DoubleSide;
        var triGeom = new THREE.Geometry();
        triGeom.vertices.push(new THREE.Vector3(-10, 10, 0), new THREE.Vector3(-10, -10, 0), new THREE.Vector3(10, 10, 0));
        triGeom.faceVertexUvs[0] = [];
        triGeom.faceVertexUvs[0][0] = [];
        triGeom.faceVertexUvs[0][0][0] = new THREE.Vector2(0, 1);
        triGeom.faceVertexUvs[0][0][1] = new THREE.Vector2(0, 0);
        triGeom.faceVertexUvs[0][0][2] = new THREE.Vector2(1, 1);
        triGeom.faces.push(new THREE.Face3(0, 1, 2));
        this.triangle = new THREE.Mesh(triGeom, triMat);
        this.triangleContainer = new THREE.Object3D();
        this.triangleContainer.position.y = -4.9;
        this.triangleContainer.add(this.triangle);
        this.scene.add(this.triangleContainer);
        if (this.object3DMode == "cube") {
            this.triangle.visible = false;
            this.triangleOverlay.visible = false;
        }
        //uvVertex-Sprites
        var bgCols = ['#5b5b5b', '#bc0017', '#a32287', '#e46436'];
        for (var i = 1; i <= 4; i++) {
            var canvas = document.createElement('canvas');
            canvas.width = canvas.height = 128;
            var ctx = canvas.getContext('2d');
            ctx.lineWidth = 10;
            ctx.font = "80px Roboto";
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";
            ctx.strokeStyle = "white";
            ctx.fillStyle = bgCols[i - 1];
            ctx.beginPath();
            ctx.arc(64, 64, 50, 0, 45);
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.fillText(i.toString(), 64, 64);
            ctx.stroke();
            var tex = new THREE.Texture(canvas);
            tex.needsUpdate = true;
            this['uvV' + i] = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
            this['uvV' + i].scale.x = 2.5;
            this['uvV' + i].scale.y = 2.5;
        }
        //Cube-Overlay
        var lineMat = new THREE.LineBasicMaterial({ color: 0xe74d15, linewidth: 1, depthWrite: false });
        var lineDashedMat = new THREE.LineDashedMaterial({ color: 0xe74d15, linewidth: 1, dashSize: 0.4, gapSize: 0.4, depthWrite: false });
        var lineGeom = new THREE.Geometry();
        var lineDashedGeom = new THREE.Geometry();
        lineGeom.vertices = [
            new THREE.Vector3(10, 10, 0),
            new THREE.Vector3(10, -10, 0),
            new THREE.Vector3(-10, -10, 0),
            new THREE.Vector3(-10, 10, 0),
            new THREE.Vector3(10, 10, 0),
        ];
        lineDashedGeom.vertices = [
            new THREE.Vector3(-10, -10, 0),
            new THREE.Vector3(10, 10, 0),
        ];
        lineDashedGeom.computeLineDistances();
        var line = new THREE.Line(lineGeom, lineMat);
        var lineDashed = new THREE.Line(lineDashedGeom, lineDashedMat);
        var cubeVerts = this.cube.geometry.vertices;
        this.uvV1.position.set(-10, 10, 0);
        this.uvV2.position.set(10, 10, 0);
        this.uvV3.position.set(-10, -10, 0);
        this.uvV4.position.set(10, -10, 0);
        this.cubeFace1.position.x = 10;
        this.cubeFace1.rotateY(Math.PI / 2);
        this.cubeFace2.position.x = -10;
        this.cubeFace2.rotateY(-Math.PI / 2);
        this.cubeFace3.position.y = 10;
        this.cubeFace3.rotateX(-Math.PI / 2);
        this.cubeFace4.position.y = -10;
        this.cubeFace4.rotateX(Math.PI / 2);
        this.cubeFace5.position.z = 10;
        this.cubeFace6.position.z = -10;
        this.cubeFace6.rotateY(Math.PI);
        for (var i = 0; i < this.cube.geometry.faces.length; i += 2) {
            var cubeFaceId = "cubeFace" + (i / 2 + 1);
            var face1 = this.cube.geometry.faces[i];
            var face2 = this.cube.geometry.faces[i + 1];
            this[cubeFaceId].add(this.uvV1.clone());
            this[cubeFaceId].add(this.uvV2.clone());
            this[cubeFaceId].add(this.uvV3.clone());
            this[cubeFaceId].add(this.uvV4.clone());
            this[cubeFaceId].add(line.clone());
            this[cubeFaceId].add(lineDashed.clone());
            this[cubeFaceId].visible = false;
            this.cubeOverlay.add(this[cubeFaceId]);
        }
        this.cubeOverlay.position.y = -4.9;
        this.sceneOverlay.add(this.cubeOverlay);
        //Triangle-Overlay
        var lineGeom = new THREE.Geometry();
        lineGeom.vertices = [
            new THREE.Vector3(-10, 10, 0),
            new THREE.Vector3(10, 10, 0),
            new THREE.Vector3(-10, -10, 0),
            new THREE.Vector3(-10, 10, 0),
        ];
        this.triangleFace.add(new THREE.Line(lineGeom, lineMat));
        this.triangleFace.add(this.uvV1.clone());
        this.triangleFace.add(this.uvV2.clone());
        this.triangleFace.add(this.uvV3.clone());
        this.triangleOverlay.position.y = -4.9;
        this.triangleOverlay.add(this.triangleFace);
        this.sceneOverlay.add(this.triangleOverlay);
    }
    /**Initialisiert alle Ereignisse*/
    View3D.prototype.InitEvents = function () {
        var _this = this;
        $(this.target).mousedown(function (e) { _this.MouseDownHandler(e); });
        $(this.target).mouseup(function (e) { _this.MouseUpHandler(e); });
        $(this.target).mouseleave(function (e) { _this.MouseLeaveHandler(e); });
        $(this.target).mousemove(function (e) { _this.MouseMoveHandler(e); });
        $(document).keydown(function (e) { _this.KeyDownHandler(e); });
        if (typeof window.addWheelListener != "undefined") {
            window.addWheelListener(this.target, function (e) { _this.MouseWheelHandler(e); });
        }
    };
    /**Mouse-Down-Handler*/
    View3D.prototype.MouseDownHandler = function (e) {
        this.isMouseDown = true;
        this.mouseDownPos.x = e.offsetX;
        this.mouseDownPos.y = e.offsetY;
        this.mouseDownRotX = this.camContainer.rotation.x;
        this.mouseDownRotY = this.camContainer.rotation.y;
        $(this.target).focus();
    };
    /**Mouse-Up-Handler*/
    View3D.prototype.MouseUpHandler = function (e) {
        this.isMouseDown = false;
    };
    /**Mouse-LeaveHandler*/
    View3D.prototype.MouseLeaveHandler = function (e) {
        this.isMouseDown = false;
    };
    /**Mouse-Move-Handler*/
    View3D.prototype.MouseMoveHandler = function (e) {
        if (this.isMouseDown) {
            var mouseDelta = {
                x: e.offsetX - this.mouseDownPos.x,
                y: e.offsetY - this.mouseDownPos.y
            };
            var rotX = this.mouseDownRotX - mouseDelta.y / 100;
            var rotY = this.mouseDownRotY - mouseDelta.x / 100;
            this.camContainer.rotation.y = rotY;
            if (rotX < Math.PI / 2 && rotX > -Math.PI / 2) {
                this.camContainer.rotation.x = rotX;
            }
            else {
                this.mouseDownPos.y = e.offsetY;
                this.mouseDownRotX = this.camContainer.rotation.x;
            }
        }
    };
    /**Mouse-Wheel-Handler*/
    View3D.prototype.MouseWheelHandler = function (e) {
        this.camZoomPos += (e.deltaY < 0) ? -4 : 4;
        e.preventDefault();
        this.CorrectZoom();
    };
    /**Key-Press-Handler*/
    View3D.prototype.KeyDownHandler = function (e) {
        e.preventDefault();
        if (e.charCode == 119) {
            e.preventDefault();
            this.camZoomPos -= 10;
        }
        else if (e.charCode == 115) {
            e.preventDefault();
            this.camZoomPos += 10;
        }
        this.CorrectZoom();
    };
    /**Korrigiert camZoomPos anhand von min- und maxZoomPos*/
    View3D.prototype.CorrectZoom = function () {
        if (this.camZoomPos < this.minZoomPos)
            this.camZoomPos = this.minZoomPos;
        else if (this.camZoomPos > this.maxZoomPos)
            this.camZoomPos = this.maxZoomPos;
    };
    /**Wird stetig ausgeführt*/
    View3D.prototype.UpdateInterval = function () {
        var _this = this;
        this.cam.position.z += (this.camZoomPos - this.cam.position.z) / 10;
        this.camContainer.position.y += (this.camY - this.camContainer.position.y) / 30;
        //this.skyboxCam.rotation.copy(this.camContainer.rotation);
        this.Render();
        this.updateIntervalID = window.requestAnimationFrame(function () { return _this.UpdateInterval(); });
    };
    /**Zeichnet die Scene neu*/
    View3D.prototype.Render = function () {
        this.renderer.autoClear = true;
        this.renderer.render(this.scene, this.cam);
        this.renderer.autoClear = false;
        this.renderer.clearDepth();
        this.renderer.render(this.sceneOverlay, this.cam);
        //Es wird nur das cube-overlay-face sichtbar, dass zur Kamera schaut
        var minAngle = Math.PI * 2;
        var camDirection = this.cam.getWorldDirection();
        var visibleCubeFaceIndex = 1;
        for (var i = 1; i <= 6; i++) {
            var faceDirection = this['cubeFace' + i].getWorldDirection();
            var camDirection = this.cam.getWorldDirection().clone();
            camDirection.multiplyScalar(-1);
            var angle = camDirection.angleTo(faceDirection);
            this['cubeFace' + i].visible = false;
            if (angle < minAngle) {
                minAngle = angle;
                visibleCubeFaceIndex = i;
            }
        }
        this['cubeFace' + visibleCubeFaceIndex].visible = true;
    };
    /**Setzt die Position des Drehpunktes der Kamera auf eine bestimmte Höhe(Y)*/
    View3D.prototype.SetCamY = function (y) {
        this.camY = y;
    };
    /**Setzt den Object3DMode auf "triangle" oder "cube"*/
    View3D.prototype.SetObject3DMode = function (mode) {
        this.object3DMode = mode;
        if (this.object3DMode == "cube") {
            this.triangle.visible = false;
            this.triangleOverlay.visible = false;
            this.cube.visible = true;
            this.cubeOverlay.visible = true;
        }
        else {
            this.triangle.visible = true;
            this.triangleOverlay.visible = true;
            this.cube.visible = false;
            this.cubeOverlay.visible = false;
        }
    };
    /**Setzt WrapS-Mode (Horizontal)
     *@param  mode  Wrap-Modus {"repeat", "clamp"}
     */
    View3D.prototype.SetWrapSMode = function (mode) {
        this.wrapSMode = mode;
        if (mode == "clamp") {
            this.cube.material.map.wrapS = THREE.ClampToEdgeWrapping;
            this.triangle.material.map.wrapS = THREE.ClampToEdgeWrapping;
        }
        else {
            this.cube.material.map.wrapS = THREE.RepeatWrapping;
            this.triangle.material.map.wrapS = THREE.RepeatWrapping;
        }
        this.cube.material.map.needsUpdate = true;
        this.triangle.material.map.needsUpdate = true;
    };
    /**Setzt WrapT-Mode (Vertikal)
     *@param  mode  Wrap-Modus {"repeat", "clamp"}
     */
    View3D.prototype.SetWrapTMode = function (mode) {
        this.wrapTMode = mode;
        if (mode == "clamp") {
            this.cube.material.map.wrapT = THREE.ClampToEdgeWrapping;
            this.triangle.material.map.wrapT = THREE.ClampToEdgeWrapping;
        }
        else {
            this.cube.material.map.wrapT = THREE.RepeatWrapping;
            this.triangle.material.map.wrapT = THREE.RepeatWrapping;
        }
        this.cube.material.map.needsUpdate = true;
        this.triangle.material.map.needsUpdate = true;
    };
    /**Setzt die Texture für das 3DObjekt
    *@param htmlImage
    */
    View3D.prototype.SetTexture = function (htmlImage) {
        var _this = this;
        this.textureLoader.load(htmlImage.src, function (tex) {
            tex.wrapS = (_this.wrapSMode == "repeat") ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
            tex.wrapT = (_this.wrapTMode == "repeat") ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
            _this.cube.material = new THREE.MeshBasicMaterial({
                map: tex
            });
            _this.cube.material.side = THREE.DoubleSide;
            _this.triangle.material = new THREE.MeshBasicMaterial({
                map: tex
            });
            _this.triangle.material.side = THREE.DoubleSide;
            _this.SetMagFilter(_this.magFilter, true);
            _this.SetMinFilter(_this.minFilter, true);
            _this.SetAnisotropic(_this.anisotropic, true);
        });
    };
    /**Setzt UV-Coordinaten*/
    View3D.prototype.SetUVCoordinates = function (vertexIndex, uvVertexCoord) {
        //cube
        var v1;
        var v2;
        if (vertexIndex == 1) {
            v1 = 0;
        }
        else if (vertexIndex == 2) {
            v1 = 2;
            v2 = 2;
        }
        else if (vertexIndex == 3) {
            v1 = 1;
            v2 = 0;
        }
        else {
            v2 = 1;
        }
        for (var i = 0; i < 12; i += 2) {
            if (typeof v1 != "undefined") {
                this.cube.geometry.faceVertexUvs[0][i][v1].set(uvVertexCoord.x, uvVertexCoord.y);
                if (i == 0)
                    this.triangle.geometry.faceVertexUvs[0][i][v1].set(uvVertexCoord.x, uvVertexCoord.y);
            }
            if (typeof v2 != "undefined") {
                this.cube.geometry.faceVertexUvs[0][i + 1][v2].set(uvVertexCoord.x, uvVertexCoord.y);
            }
        }
        this.cube.geometry.uvsNeedUpdate = true;
        this.triangle.geometry.uvsNeedUpdate = true;
    };
    /**Setzt den Magnification-Filter
    *@param magFilter  Magnification-Filter {"nearest", "linear"}
    */
    View3D.prototype.SetMagFilter = function (magFilter, excludeCubeRoom, excludeCube, excludeTriangle) {
        if (excludeCubeRoom === void 0) { excludeCubeRoom = false; }
        if (excludeCube === void 0) { excludeCube = false; }
        if (excludeTriangle === void 0) { excludeTriangle = false; }
        this.magFilter = magFilter;
        if (magFilter == "nearest") {
            if (excludeCubeRoom == false)
                this.cubeRoom.material.map.magFilter = THREE.NearestFilter;
            if (excludeCube == false)
                this.cube.material.map.magFilter = THREE.NearestFilter;
            if (excludeTriangle == false)
                this.triangle.material.map.magFilter = THREE.NearestFilter;
        }
        else if (magFilter == "linear") {
            if (excludeCubeRoom == false)
                this.cubeRoom.material.map.magFilter = THREE.LinearFilter;
            if (excludeCube == false)
                this.cube.material.map.magFilter = THREE.LinearFilter;
            if (excludeTriangle == false)
                this.triangle.material.map.magFilter = THREE.LinearFilter;
        }
        if (excludeCubeRoom == false)
            this.cubeRoom.material.map.needsUpdate = true;
        if (excludeCube == false)
            this.cube.material.map.needsUpdate = true;
        if (excludeTriangle == false)
            this.triangle.material.map.needsUpdate = true;
    };
    /**Setzt den Minification-Filter
    *@param minFilter  Minification-Filter {"nearest", "linear", "nmmn", "nmml", "lmmn", "lmml"}
    */
    View3D.prototype.SetMinFilter = function (minFilter, excludeCubeRoom, excludeCube, excludeTriangle) {
        if (excludeCubeRoom === void 0) { excludeCubeRoom = false; }
        if (excludeCube === void 0) { excludeCube = false; }
        if (excludeTriangle === void 0) { excludeTriangle = false; }
        this.minFilter = minFilter;
        if (minFilter == "nearest") {
            if (excludeCubeRoom == false)
                this.cubeRoom.material.map.minFilter = THREE.NearestFilter;
            if (excludeCube == false)
                this.cube.material.map.minFilter = THREE.NearestFilter;
            if (excludeTriangle == false)
                this.triangle.material.map.minFilter = THREE.NearestFilter;
        }
        else if (minFilter == "linear") {
            if (excludeCubeRoom == false)
                this.cubeRoom.material.map.minFilter = THREE.LinearFilter;
            if (excludeCube == false)
                this.cube.material.map.minFilter = THREE.LinearFilter;
            if (excludeTriangle == false)
                this.triangle.material.map.minFilter = THREE.LinearFilter;
        }
        else if (minFilter == "nmmn") {
            if (excludeCubeRoom == false)
                this.cubeRoom.material.map.minFilter = THREE.NearestMipMapNearestFilter;
            if (excludeCube == false)
                this.cube.material.map.minFilter = THREE.NearestMipMapNearestFilter;
            if (excludeTriangle == false)
                this.triangle.material.map.minFilter = THREE.NearestMipMapNearestFilter;
        }
        else if (minFilter == "nmml") {
            if (excludeCubeRoom == false)
                this.cubeRoom.material.map.minFilter = THREE.NearestMipMapLinearFilter;
            if (excludeCube == false)
                this.cube.material.map.minFilter = THREE.NearestMipMapLinearFilter;
            if (excludeTriangle == false)
                this.triangle.material.map.minFilter = THREE.NearestMipMapLinearFilter;
        }
        else if (minFilter == "lmmn") {
            if (excludeCubeRoom == false)
                this.cubeRoom.material.map.minFilter = THREE.LinearMipMapNearestFilter;
            if (excludeCube == false)
                this.cube.material.map.minFilter = THREE.LinearMipMapNearestFilter;
            if (excludeTriangle == false)
                this.triangle.material.map.minFilter = THREE.LinearMipMapNearestFilter;
        }
        else if (minFilter == "lmml") {
            if (excludeCubeRoom == false)
                this.cubeRoom.material.map.minFilter = THREE.LinearMipMapLinearFilter;
            if (excludeCube == false)
                this.cube.material.map.minFilter = THREE.LinearMipMapLinearFilter;
            if (excludeTriangle == false)
                this.triangle.material.map.minFilter = THREE.LinearMipMapLinearFilter;
        }
        if (excludeCubeRoom == false)
            this.cubeRoom.material.map.needsUpdate = true;
        if (excludeCube == false)
            this.cube.material.map.needsUpdate = true;
        if (excludeTriangle == false)
            this.triangle.material.map.needsUpdate = true;
    };
    /**Setzt Anisotropic-Filter
    *@param anisotropic  Anisotropic-Filter {0, 2, 4, 8, 16}. 0=Off
    */
    View3D.prototype.SetAnisotropic = function (anisotropic, excludeCubeRoom, excludeCube, excludeTriangle) {
        if (excludeCubeRoom === void 0) { excludeCubeRoom = false; }
        if (excludeCube === void 0) { excludeCube = false; }
        if (excludeTriangle === void 0) { excludeTriangle = false; }
        if (anisotropic == 0)
            anisotropic = 1;
        if (this.renderer.getMaxAnisotropy() < anisotropic) {
            window.alert('Your GPU supports only a anisotropic-value up to ' + this.renderer.getMaxAnisotropy().toString() + 'x');
            return false;
        }
        this.anisotropic = anisotropic;
        if (excludeCubeRoom == false) {
            this.cubeRoom.material.map.anisotropy = anisotropic;
            this.cubeRoom.material.map.needsUpdate = true;
        }
        if (excludeCube == false) {
            this.cube.material.map.anisotropy = anisotropic;
            this.cube.material.map.needsUpdate = true;
        }
        if (excludeTriangle == false) {
            this.triangle.material.map.anisotropy = anisotropic;
            this.triangle.material.map.needsUpdate = true;
        }
        return true;
    };
    return View3D;
}());
var TextureSelect = (function () {
    /**
     * Konstruktor
     * @param htmlImages  Array mit HTML-Image-Elementen
     */
    function TextureSelect(htmlImages) {
        var _this = this;
        /**Wird ausgeführt wenn eine Textur ausgewählt wird
        *@param image  HTML-Image-Element der Textur*/
        this.onSelectTexture = function (htmlImage) { };
        this.htmlImages = htmlImages;
        this.$htmlImages = $(this.htmlImages);
        this.$htmlImages.css({ 'cursor': 'pointer' });
        this.$htmlImages.click(function (e) { _this.ImageClickHandler(e); });
    }
    /**
     * Wählt das angeklickte Texture-Image aus und die anderen werden deselektiert
     * @param e  JQuery Maus-Ereignis-Objekt
     */
    TextureSelect.prototype.ImageClickHandler = function (e) {
        this.$htmlImages.css({ 'border': '3px solid transparent' }).removeAttr('checked');
        $(e.delegateTarget).css({ 'border': '3px solid #6cbad5' }).attr('checked', 'checked');
        this.onSelectTexture(e.delegateTarget);
    };
    /**
     * Wählt eine Textur aus
     * @param htmlImagesIndex  Der Index der zu auswählenden Textur: Default: 0 (Erste Textur)
     */
    TextureSelect.prototype.SelectTexture = function (htmlImagesIndex) {
        if (htmlImagesIndex === void 0) { htmlImagesIndex = 0; }
        this.$htmlImages.css({ 'border': '3px solid transparent' }).removeAttr('checked');
        $(this.htmlImages[htmlImagesIndex]).css({ 'border': '3px solid #6cbad5' }).attr('checked', 'checked');
        this.onSelectTexture(this.htmlImages[htmlImagesIndex]);
    };
    return TextureSelect;
}());
/**UV-Editor
*@author  Jarek Sarbiewski
*/
var UVEditor = (function () {
    /**Konstruktor
    *@param  target         Ein HTML-Div-Container indem der UV-Editor angezeigt werden soll
    *@param  wrapSMode      Wie die Textur in der Horizontalen fortgeführt werden soll {"repeat", "clamp"}
    *@param  wrapTMode      Wie die Textur in der Vertikalen fortgeführt werden soll {"repeat", "clamp"}
    *@param  object3DMode   Ob 3 oder 4 uvVertexes angezeigt werden sollen {"triangle", "cube"}
    *@param  vertexSnapping Ob die uv-Vertexes auf einem Raster ausgerichtet werden sollen
    */
    function UVEditor(target, wrapSMode, wrapTMode, object3DMode, vertexSnapping) {
        this.canvasZoom = 0.5;
        //Ereignis-Variablen
        this.mouseDownPos = new THREE.Vector2();
        this.mouseDownVertexPos = new THREE.Vector2();
        /**Wird ausgeführt wenn sich die UV-Koordinaten ändern
        *@param vertexIndex    Index (1 bis 4) des Vertex dessen uvKoordinaten geändert wurden
        *@param uvVertexCoord  Die neuen uvKoordinaten
        */
        this.onChangeUVCoordinates = function (vertexIndex, uvVertexCoord) { };
        this.target = target;
        this.$target = $(target);
        this.$target.css({ 'position': 'relative', 'overflow': 'hidden' });
        this.targetSize = new THREE.Vector2(this.$target.width(), this.$target.height());
        this.wrapSMode = wrapSMode;
        this.wrapTMode = wrapTMode;
        this.object3DMode = object3DMode;
        this.vertexSnapping = vertexSnapping;
        //Canvas
        $(this.target).append('<canvas id="uvCanvas" width="2560" height="2560"></canvas>');
        this.$canvas = $('#uvCanvas');
        this.canvasPos = new THREE.Vector2();
        this.canvasPos.x = -640 + this.targetSize.x / 2;
        this.canvasPos.y = -640 + this.targetSize.y / 2;
        this.$canvas.css({
            'width': (2560 * this.canvasZoom) + 'px',
            'position': 'absolute',
            'left': this.canvasPos.x + 'px',
            'top': this.canvasPos.y + 'px',
            'cursor': 'move'
        });
        this.canvasSize = new THREE.Vector2(this.$canvas.width(), this.$canvas.height());
        this.canvas = this.$canvas.get(0);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.fillStyle = "white";
        //Canvas-Overlay
        $(this.target).append('<canvas id="uvCanvasOverlay" width="' + Math.ceil(this.targetSize.x) + '" height="' + Math.ceil(this.targetSize.y) + '"></canvas>');
        this.$canvasOverlay = $('#uvCanvasOverlay');
        this.$canvasOverlay.css({
            'position': 'absolute',
            'left': '0',
            'top': '0',
            'cursor': 'move'
        });
        this.canvasOverlay = this.$canvasOverlay.get(0);
        this.ctxOverlay = this.canvasOverlay.getContext('2d');
        //HTML-uvVertexes werden erstellt
        this.$target.append('<div id="uvVertex1" class="uvVertex"></div>');
        this.$target.append('<div id="uvVertex2" class="uvVertex"></div>');
        this.$target.append('<div id="uvVertex3" class="uvVertex"></div>');
        this.$target.append('<div id="uvVertex4" class="uvVertex"></div>');
        this.$uvV1 = $('#uvEditor #uvVertex1');
        this.$uvV2 = $('#uvEditor #uvVertex2');
        this.$uvV3 = $('#uvEditor #uvVertex3');
        this.$uvV4 = $('#uvEditor #uvVertex4');
        this.$uvV1.css({ 'background': '#5b5b5b' }).append('1');
        this.$uvV2.css({ 'background': '#bc0017' }).append('2');
        this.$uvV3.css({ 'background': '#a32287' }).append('3');
        this.$uvV4.css({ 'background': '#e46436', 'display': ((this.object3DMode == "triangle") ? 'none' : 'block') }).append('4');
        this.uvV1Coord = new THREE.Vector2(0, 0);
        this.uvV2Coord = new THREE.Vector2(1, 0);
        this.uvV3Coord = new THREE.Vector2(0, 1);
        this.uvV4Coord = new THREE.Vector2(1, 1);
        this.$uvVs = this.$target.find(' .uvVertex');
        this.$uvVs.css('z-index', this.highestVertexZIndex = 1000);
        this.UpdateHTMLVertexPositions();
        this.InitMouseEvents();
    }
    /**Initialisiert alle Mausereignisse*/
    UVEditor.prototype.InitMouseEvents = function () {
        var _this = this;
        this.$canvasOverlay.mousedown(function (e) { _this.CanvasOverlayMouseDownHandler(e); });
        if (typeof window.addWheelListener != "undefined") {
            window.addWheelListener(this.target, function (e) { _this.MouseWheelHandler(e); });
        }
        this.$uvVs.mousedown(function (e) { _this.UVVertexMouseDownHandler(e); });
    };
    /**uvVertex-Mouse-Down-Handler*/
    UVEditor.prototype.UVVertexMouseDownHandler = function (e) {
        var _this = this;
        this.mouseDownPos.x = e.pageX;
        this.mouseDownPos.y = e.pageY;
        var v = $(e.delegateTarget);
        v.css('z-index', (++this.highestVertexZIndex).toString());
        this.mouseDownVertexPos.x = v.position().left + v.outerWidth() / 2;
        this.mouseDownVertexPos.y = v.position().top + v.outerWidth() / 2;
        this.$target.mousemove({ v: v }, function (e) { _this.TargetMouseMoveHandler(e); });
        this.$target.mouseup({ v: v }, function (e) { _this.TargetMouseUpHandler(e); });
    };
    /**Target Mouse-Move-Handler um Vertex zu verschieben*/
    UVEditor.prototype.TargetMouseMoveHandler = function (e) {
        var v = e.data.v;
        var vIndex = v.attr('id').substr(-1, 1);
        var newVPos = this.mouseDownVertexPos.clone().add(new THREE.Vector2(e.pageX, e.pageY).sub(this.mouseDownPos));
        var uvCoordId = 'uvV' + vIndex + 'Coord';
        this[uvCoordId] = this.HTMLPosToUVCoord(newVPos);
        if (this.vertexSnapping) {
            this[uvCoordId].x = Math.round(this[uvCoordId].x / 0.125) * 0.125;
            this[uvCoordId].y = Math.round(this[uvCoordId].y / 0.125) * 0.125;
            newVPos = this.UVCoordToHTMLPos(this[uvCoordId]);
        }
        v.css({ 'left': (newVPos.x - v.outerWidth() / 2) + 'px', 'top': (newVPos.y - v.outerWidth() / 2) + 'px' });
        this.RenderOverlay();
        this.onChangeUVCoordinates(parseInt(vIndex), this[uvCoordId].clone());
    };
    /**Target Mouse-Up-Handler nach der Vershiebung eines Vertex*/
    UVEditor.prototype.TargetMouseUpHandler = function (e) {
        this.$target.off('mousemove mouseup');
    };
    /**Canvas Mouse-Down-Handler*/
    UVEditor.prototype.CanvasOverlayMouseDownHandler = function (e) {
        var _this = this;
        this.mouseDownPos.x = e.pageX;
        this.mouseDownPos.y = e.pageY;
        this.canvasPosAtMouseDown = this.canvasPos.clone();
        this.$canvasOverlay.mousemove(function (e) { _this.CanvasOverlayMouseMoveHandler(e); });
        this.$canvasOverlay.mouseup(function (e) { _this.CanvasOverlayMouseUpHandler(e); });
    };
    /**Canvas Mouse-Move-Handler*/
    UVEditor.prototype.CanvasOverlayMouseMoveHandler = function (e) {
        this.canvasPos = this.canvasPosAtMouseDown.clone();
        this.canvasPos.add(new THREE.Vector2(e.pageX, e.pageY).sub(this.mouseDownPos));
        if (this.canvasPos.x > 0)
            this.canvasPos.x = 0;
        else if (this.canvasPos.x + this.canvasSize.x < this.targetSize.x)
            this.canvasPos.x = this.targetSize.x - this.canvasSize.x;
        if (this.canvasPos.y > 0)
            this.canvasPos.y = 0;
        else if (this.canvasPos.y + this.canvasSize.y < this.targetSize.y)
            this.canvasPos.y = this.targetSize.y - this.canvasSize.y;
        this.$canvas.css({ 'left': this.canvasPos.x + 'px', 'top': this.canvasPos.y + 'px' });
        this.RenderOverlay();
        this.UpdateHTMLVertexPositions();
    };
    /**Canvas Mouse-Leave-Handler*/
    UVEditor.prototype.CanvasOverlayMouseUpHandler = function (e) {
        this.canvasPos = new THREE.Vector2(parseInt(this.$canvas.css('left')), parseInt(this.$canvas.css('top')));
        this.$canvasOverlay.off('mousemove');
        this.$canvasOverlay.off('mouseup');
        this.RenderOverlay();
        this.UpdateHTMLVertexPositions();
    };
    /**Mouse-Wheel-Handler*/
    UVEditor.prototype.MouseWheelHandler = function (e) {
        e.preventDefault();
        this.canvasZoom += (e.deltaY < 0) ? .05 : -.05;
        var minZoom = Math.max(this.targetSize.x, this.targetSize.y) / 2560;
        if (this.canvasZoom < minZoom)
            this.canvasZoom = minZoom;
        else if (this.canvasZoom > 1)
            this.canvasZoom = 1;
        var newSize = 2560 * this.canvasZoom;
        this.canvasPos.x = ((this.canvasPos.x - this.targetSize.x / 2) / this.canvasSize.x) * newSize + this.targetSize.x / 2;
        this.canvasPos.y = ((this.canvasPos.y - this.targetSize.y / 2) / this.canvasSize.y) * newSize + this.targetSize.y / 2;
        this.canvasSize.x = newSize;
        this.canvasSize.y = newSize;
        if (this.canvasPos.x > 0)
            this.canvasPos.x = 0;
        else if (this.canvasPos.x + this.canvasSize.x < this.targetSize.x)
            this.canvasPos.x = this.targetSize.x - this.canvasSize.x;
        if (this.canvasPos.y > 0)
            this.canvasPos.y = 0;
        else if (this.canvasPos.y + this.canvasSize.y < this.targetSize.y)
            this.canvasPos.y = this.targetSize.y - this.canvasSize.y;
        this.$canvas.width(newSize);
        this.$canvas.css({ 'left': this.canvasPos.x + 'px', 'top': this.canvasPos.y + 'px' });
        //this.ctx.putImageData(this.currImageDataWithoutLines, 0, 0);
        this.RenderOverlay();
        this.UpdateHTMLVertexPositions();
    };
    /**Setzt HTML-ImageElement*/
    UVEditor.prototype.SetHTMLImage = function (htmlImage) {
        this.htmlImage = htmlImage;
        this.Render();
        this.RenderOverlay();
    };
    /**Setzt WrapS-Mode (Horizontal)
     *@param  mode  Wrap-Modus {"repeat", "clamp"}
     */
    UVEditor.prototype.SetWrapSMode = function (mode) {
        this.wrapSMode = mode;
        this.Render();
    };
    /**Setzt WrapT-Mode (Vertikal)
     *@param  mode  Wrap-Modus {"repeat", "clamp"}
     */
    UVEditor.prototype.SetWrapTMode = function (mode) {
        this.wrapTMode = mode;
        this.Render();
    };
    /**Zeichnet Canvas neu*/
    UVEditor.prototype.Render = function () {
        this.ctx.fillStyle = "#fff";
        this.ctx.fillRect(0, 0, 2560, 2560);
        if (this.wrapSMode == UVEditor.WRAP_MODE_REPEAT && this.wrapTMode == UVEditor.WRAP_MODE_REPEAT) {
            for (var i = 0; i < 5; i++) {
                for (var j = 0; j < 5; j++) {
                    this.ctx.drawImage(this.htmlImage, i * 512, j * 512, 512, 512);
                }
            }
        }
        else if (this.wrapSMode == UVEditor.WRAP_MODE_CLAMP && this.wrapTMode == UVEditor.WRAP_MODE_CLAMP) {
            this.ctx.drawImage(this.htmlImage, 1024, 1024, 512, 512);
            var topClamp = this.ctx.getImageData(1024, 1024, 512, 1);
            var bottomClamp = this.ctx.getImageData(1024, 1535, 512, 1);
            var leftClamp = this.ctx.getImageData(1024, 1024, 1, 512);
            var rightClamp = this.ctx.getImageData(1535, 1024, 1, 512);
            var tlPixel = this.ctx.getImageData(1024, 1024, 1, 1);
            var trPixel = this.ctx.getImageData(1535, 1024, 1, 1);
            var blPixel = this.ctx.getImageData(1024, 1535, 1, 1);
            var brPixel = this.ctx.getImageData(1535, 1535, 1, 1);
            //for (var i = 0; i < 1024; i++)
            //{
            //    this.ctx.putImageData(topClamp, 1024, i, 0, 0, 512, 1);
            //    this.ctx.putImageData(bottomClamp, 1024, i + 1536, 0, 0, 512, 1);
            //    this.ctx.putImageData(leftClamp, i, 1024, 0, 0, 1, 512);
            //    this.ctx.putImageData(rightClamp, i + 1536, 1024, 0, 0, 1, 512);
            //}
            var c = document.createElement('canvas');
            c.width = 512;
            c.height = 1;
            var ctx = c.getContext('2d');
            ctx.putImageData(topClamp, 0, 0, 0, 0, 512, 1);
            var cp = ctx.createPattern(c, "repeat");
            this.ctx.fillStyle = cp;
            this.ctx.fillRect(1024, 0, 512, 1024);
            ctx.putImageData(bottomClamp, 0, 0, 0, 0, 512, 1);
            var cp = ctx.createPattern(c, "repeat");
            this.ctx.fillStyle = cp;
            this.ctx.fillRect(1024, 1536, 512, 1024);
            c.width = 1;
            c.height = 512;
            var ctx = c.getContext('2d');
            ctx.putImageData(leftClamp, 0, 0, 0, 0, 1, 512);
            var cp = ctx.createPattern(c, "repeat");
            this.ctx.fillStyle = cp;
            this.ctx.fillRect(0, 1024, 1024, 512);
            ctx.putImageData(rightClamp, 0, 0, 0, 0, 1, 512);
            var cp = ctx.createPattern(c, "repeat");
            this.ctx.fillStyle = cp;
            this.ctx.fillRect(1536, 1024, 1024, 512);
            this.ctx.fillStyle = "rgb(" + tlPixel.data[0] + "," + tlPixel.data[1] + "," + tlPixel.data[2] + ")";
            this.ctx.fillRect(0, 0, 1024, 1024);
            this.ctx.fillStyle = "rgb(" + trPixel.data[0] + "," + trPixel.data[1] + "," + trPixel.data[2] + ")";
            this.ctx.fillRect(1536, 0, 1024, 1024);
            this.ctx.fillStyle = "rgb(" + blPixel.data[0] + "," + blPixel.data[1] + "," + blPixel.data[2] + ")";
            this.ctx.fillRect(0, 1536, 1024, 1024);
            this.ctx.fillStyle = "rgb(" + brPixel.data[0] + "," + brPixel.data[1] + "," + brPixel.data[2] + ")";
            this.ctx.fillRect(1536, 1536, 1024, 1024);
        }
        else if (this.wrapSMode == UVEditor.WRAP_MODE_REPEAT) {
            for (i = 0; i < 5; i++) {
                this.ctx.drawImage(this.htmlImage, i * 512, 1024, 512, 512);
            }
            var topClamp = this.ctx.getImageData(0, 1024, 2560, 1);
            var bottomClamp = this.ctx.getImageData(0, 1535, 2560, 1);
            //for (var i = 0; i < 1024; i++)
            //{ 
            //    this.ctx.putImageData(topClamp, 0, i, 0, 0, 2560, 1);
            //    this.ctx.putImageData(bottomClamp, 0, i + 1536, 0, 0, 2560, 1);
            //}
            var c = document.createElement('canvas');
            c.width = 2560;
            c.height = 1;
            var ctx = c.getContext('2d');
            ctx.putImageData(topClamp, 0, 0, 0, 0, 2560, 1);
            var cp = ctx.createPattern(c, "repeat");
            this.ctx.fillStyle = cp;
            this.ctx.fillRect(0, 0, 2560, 1024);
            ctx.putImageData(bottomClamp, 0, 0, 0, 0, 2560, 1);
            var cp = ctx.createPattern(c, "repeat");
            this.ctx.fillStyle = cp;
            this.ctx.fillRect(0, 1536, 2560, 1024);
        }
        else {
            for (i = 0; i < 5; i++) {
                this.ctx.drawImage(this.htmlImage, 1024, i * 512, 512, 512);
            }
            var leftClamp = this.ctx.getImageData(1024, 0, 1, 2560);
            var rightClamp = this.ctx.getImageData(1535, 0, 1, 2560);
            //for (var i = 0; i < 1024; i++)
            //{
            //    this.ctx.putImageData(leftClamp, i, 0, 0, 0, 1, 2560);
            //    this.ctx.putImageData(rightClamp, i + 1536, 0, 0, 0, 1, 2560);
            //}
            var c = document.createElement('canvas');
            c.width = 1;
            c.height = 2560;
            var ctx = c.getContext('2d');
            ctx.putImageData(leftClamp, 0, 0, 0, 0, 1, 2560);
            var cp = ctx.createPattern(c, "repeat");
            this.ctx.fillStyle = cp;
            this.ctx.fillRect(0, 0, 1024, 2560);
            ctx.putImageData(rightClamp, 0, 0, 0, 0, 1, 2560);
            var cp = ctx.createPattern(c, "repeat");
            this.ctx.fillStyle = cp;
            this.ctx.fillRect(1536, 0, 1024, 2560);
        }
        //this.currImageDataWithoutLines = this.ctx.getImageData(0, 0, 2560, 2560);
        //this.RenderOverlay();
    };
    /**Zeichnet CanvasOverlay neu*/
    UVEditor.prototype.RenderOverlay = function () {
        this.ctxOverlay.clearRect(0, 0, this.targetSize.x, this.targetSize.y);
        this.ctxOverlay.lineWidth = 1;
        this.ctxOverlay.strokeStyle = "white";
        this.ctxOverlay.setLineDash([]);
        for (var i = -1; i < 3; i++) {
            this.ctxOverlay.beginPath();
            var pos = this.UVCoordToHTMLPos(new THREE.Vector2(-2, i));
            this.ctxOverlay.moveTo(pos.x, pos.y);
            pos = this.UVCoordToHTMLPos(new THREE.Vector2(3, i));
            this.ctxOverlay.lineTo(pos.x, pos.y);
            this.ctxOverlay.stroke();
            this.ctxOverlay.beginPath();
            pos = this.UVCoordToHTMLPos(new THREE.Vector2(i, -2));
            this.ctxOverlay.moveTo(pos.x, pos.y);
            pos = this.UVCoordToHTMLPos(new THREE.Vector2(i, 3));
            this.ctxOverlay.lineTo(pos.x, pos.y);
            this.ctxOverlay.stroke();
        }
        this.ctxOverlay.lineWidth = 2;
        this.ctxOverlay.strokeStyle = "#e74d15";
        this.ctxOverlay.setLineDash([]);
        var vPos1 = this.UVCoordToHTMLPos(this.uvV1Coord);
        var vPos2 = this.UVCoordToHTMLPos(this.uvV2Coord);
        var vPos3 = this.UVCoordToHTMLPos(this.uvV3Coord);
        var vPos4 = this.UVCoordToHTMLPos(this.uvV4Coord);
        this.ctxOverlay.beginPath();
        if (this.object3DMode == "cube") {
            this.ctxOverlay.moveTo(vPos1.x, vPos1.y);
            this.ctxOverlay.lineTo(vPos2.x, vPos2.y);
            this.ctxOverlay.lineTo(vPos4.x, vPos4.y);
            this.ctxOverlay.lineTo(vPos3.x, vPos3.y);
            this.ctxOverlay.lineTo(vPos1.x, vPos1.y);
            this.ctxOverlay.stroke();
            this.ctxOverlay.lineWidth = 1;
            this.ctxOverlay.setLineDash([4, 4]);
            this.ctxOverlay.beginPath();
            this.ctxOverlay.moveTo(vPos2.x, vPos2.y);
            this.ctxOverlay.lineTo(vPos3.x, vPos3.y);
        }
        else {
            this.ctxOverlay.moveTo(vPos1.x, vPos1.y);
            this.ctxOverlay.lineTo(vPos2.x, vPos2.y);
            this.ctxOverlay.lineTo(vPos3.x, vPos3.y);
            this.ctxOverlay.lineTo(vPos1.x, vPos1.y);
        }
        this.ctxOverlay.stroke();
    };
    /**Positioniert die HTML-uvVertexes anhand der UV-Koordinaten uvV1Pos bis uvV4Pos*/
    UVEditor.prototype.UpdateHTMLVertexPositions = function () {
        for (var i = 1; i <= 4; i++) {
            var uvV = this['$uvV' + i];
            var uvVPos = this.UVCoordToHTMLPos(this['uvV' + i + 'Coord']);
            uvV.css({
                'left': (uvVPos.x - 10) + 'px',
                'top': (uvVPos.y - 10) + 'px'
            });
        }
    };
    /**Wandelt UV-Koordinaten in HTML-Position um
     * @param  uvCoord  Position als UV-Koordinate
     * @return HTML-Position
     */
    UVEditor.prototype.UVCoordToHTMLPos = function (uvCoord) {
        return new THREE.Vector2((this.canvasPos.x + (uvCoord.x + 2) * 512 * this.canvasZoom), (this.canvasPos.y + (uvCoord.y + 2) * 512 * this.canvasZoom));
    };
    /**Wandelt HTML-Position in UV-Koordinaten um
    *@param htmlPos  HTML-Position
    *@return UV-Koordinaten
    */
    UVEditor.prototype.HTMLPosToUVCoord = function (htmlPos) {
        return new THREE.Vector2(((htmlPos.x - this.canvasPos.x) / this.canvasZoom / 512 - 2), ((htmlPos.y - this.canvasPos.y) / this.canvasZoom / 512 - 2));
    };
    /**Setzt den 3d-object-Modus auf "triangle" (3 uvVertexes) ode "cube" (4 uvVertexes)*/
    UVEditor.prototype.SetObject3DMode = function (mode) {
        this.object3DMode = mode;
        this.Render();
        this.RenderOverlay();
        if (mode == "triangle")
            this.$uvV4.css('display', 'none');
        else
            this.$uvV4.css('display', 'block');
    };
    /**Setzt vertexSnapping*/
    UVEditor.prototype.SetVertexSnapping = function (vertexSnapping) {
        this.vertexSnapping = vertexSnapping;
    };
    /**Setzt die Uv-Koordinaten wieder auf den Ursprungszustand*/
    UVEditor.prototype.ResetUVCoordinates = function () {
        this.uvV1Coord = new THREE.Vector2(0, 0);
        this.uvV2Coord = new THREE.Vector2(1, 0);
        this.uvV3Coord = new THREE.Vector2(0, 1);
        this.uvV4Coord = new THREE.Vector2(1, 1);
        var p1 = this.UVCoordToHTMLPos(this.uvV1Coord);
        var p2 = this.UVCoordToHTMLPos(this.uvV2Coord);
        var p3 = this.UVCoordToHTMLPos(this.uvV3Coord);
        var p4 = this.UVCoordToHTMLPos(this.uvV4Coord);
        this.$uvV1.css({ 'left': (p1.x - this.$uvV1.outerWidth() / 2) + 'px', 'top': (p1.y - this.$uvV1.outerWidth() / 2) + 'px' });
        this.$uvV2.css({ 'left': (p2.x - this.$uvV2.outerWidth() / 2) + 'px', 'top': (p2.y - this.$uvV2.outerWidth() / 2) + 'px' });
        this.$uvV3.css({ 'left': (p3.x - this.$uvV3.outerWidth() / 2) + 'px', 'top': (p3.y - this.$uvV3.outerWidth() / 2) + 'px' });
        this.$uvV4.css({ 'left': (p4.x - this.$uvV4.outerWidth() / 2) + 'px', 'top': (p4.y - this.$uvV4.outerWidth() / 2) + 'px' });
        this.RenderOverlay();
        this.onChangeUVCoordinates(1, this.uvV1Coord.clone());
        this.onChangeUVCoordinates(2, this.uvV2Coord.clone());
        this.onChangeUVCoordinates(3, this.uvV3Coord.clone());
        this.onChangeUVCoordinates(4, this.uvV4Coord.clone());
    };
    //Statische Variablen
    UVEditor.WRAP_MODE_REPEAT = "repeat";
    UVEditor.WRAP_MODE_CLAMP = "clamp";
    return UVEditor;
}());
/// <reference path="view3d.ts" />
/// <reference path="textureselect.ts" />
/// <reference path="uveditor.ts" />
/**
*@author  Jarek Sarbiewski
*@requires  JQuery 1.12.0, three.js r73
*/
var App = (function () {
    /** Konstruktor
    *@param  uvEditorTarget  Ein HTML-DIV-Element indem der UV-Editor dargestellt werden soll
    *@param  view3DTarget    Ein HTML-DIV-Element indem die 3D-Darstellung gezeichnet werden soll
    *@param  textureImages   Array mit den HTML-IMGs die als Radio-Buttons für die Texturauswahl dienen
    *@param  object3DMode    Modus der 3D-View und des Uv-Editors auf {"triangle", "cube"}
    *@param  vertexSnapping  Ob die uv-Vertexes auf einem Raster ausgerichtet werden sollen
    *@param  magFilter     Magnification-Filter {"nearest", "linear", "nmmn", "nmml", "lmmn", "lmml"}
    *@param  minFilter     Minification-Filter {"nearest", "linear", "mipmap"}
    *@param  anisotropic   Anisotropic-Filter {0, 2, 4, 8, 16}. 0=off
    */
    function App(uvEditorTarget, view3DTarget, textureImages, wrapSMode, wrapTMode, object3DMode, vertexSnapping, magFilter, minFilter, anisotropic) {
        var _this = this;
        this.loadedImagesCount = 0;
        this.uvEditorTarget = uvEditorTarget;
        this.view3DTarget = view3DTarget;
        this.textureImages = textureImages;
        this.wrapSMode = wrapSMode;
        this.wrapTMode = wrapTMode;
        this.object3DMode = object3DMode;
        this.vertexSnapping = vertexSnapping;
        this.magFilter = magFilter;
        this.minFilter = minFilter;
        this.anisotropic = anisotropic;
        console.log("object3DMode init on \"" + object3DMode + "\"");
        for (var i = 0; i < this.textureImages.length; i++) {
            //this.textureImages[i].crossOrigin = "Anonymous";
            if (this.textureImages[i].complete) {
                this.loadedImagesCount++;
                console.log("Texture-Image " + this.loadedImagesCount + " loaded (complete:true)");
            }
            else {
                this.textureImages[i].onload = function () { return _this.TextureImageLoadHandler(); };
            }
            if (this.loadedImagesCount == this.textureImages.length)
                this.Init();
        }
    }
    /**Wird ausgeführt wenn ein textureImage geladen worden ist*/
    App.prototype.TextureImageLoadHandler = function () {
        this.loadedImagesCount++;
        console.log("Texture-Image " + this.loadedImagesCount + " loaded (onload-Event)");
        if (this.loadedImagesCount == this.textureImages.length)
            this.Init();
    };
    /**Initialisierung*/
    App.prototype.Init = function () {
        var _this = this;
        this.uvEditor = new UVEditor(this.uvEditorTarget, this.wrapSMode, this.wrapTMode, this.object3DMode, this.vertexSnapping);
        this.view3D = new View3D(this.view3DTarget, this.object3DMode, this.magFilter, this.minFilter, this.anisotropic);
        this.textureSelect = new TextureSelect(this.textureImages);
        this.textureSelect.onSelectTexture = function (htmlImage) {
            _this.uvEditor.SetHTMLImage(htmlImage);
            _this.view3D.SetTexture(htmlImage);
        };
        this.uvEditor.onChangeUVCoordinates = function (vertexIndex, uvVertexCoord) {
            //uvVertexCoord.y wird für 3DView invertiert
            uvVertexCoord.y = 1 + uvVertexCoord.y * (-1);
            _this.view3D.SetUVCoordinates(vertexIndex, uvVertexCoord);
        };
        this.textureSelect.SelectTexture(0);
    };
    /**Setzt WrapS-Mode (Horizontal)
     *@param  mode  Wrap-Modus {"repeat", "clamp"}
     */
    App.prototype.SetWrapSMode = function (mode) {
        this.wrapSMode = mode;
        this.uvEditor.SetWrapSMode(mode);
        this.view3D.SetWrapSMode(mode);
    };
    /**Setzt WrapT-Mode (Vertikal)
     *@param  mode  Wrap-Modus {"repeat", "clamp"}
     */
    App.prototype.SetWrapTMode = function (mode) {
        this.wrapTMode = mode;
        this.uvEditor.SetWrapTMode(mode);
        this.view3D.SetWrapTMode(mode);
    };
    /**Setzt den Modus der 3D-View und des Uv-Editors auf "triangle" oder "cube"
    *@param mode  3D-Object-Modus {"triangle", "cube"}*/
    App.prototype.SetObject3DMode = function (mode) {
        this.object3DMode = mode;
        this.uvEditor.SetObject3DMode(mode);
        this.view3D.SetObject3DMode(mode);
        console.log("Object3DMode change to \"" + mode + "\"");
    };
    /**Schaltet Raster-Ausrichtung an bzw. aus*/
    App.prototype.SwitchVertexSnapping = function () {
        this.vertexSnapping = !this.vertexSnapping;
        this.uvEditor.SetVertexSnapping(this.vertexSnapping);
    };
    /**Setzt die UV-Koordinaten wieder auf den Ursprungszustand*/
    App.prototype.ResetUVCoordinates = function () {
        if (window.confirm('The UV-Coordinates will be reset'))
            this.uvEditor.ResetUVCoordinates();
    };
    /**Setzt den Magnification-Filter für die 3D-Ansicht
    *@param magFilter  Magnification-Filter {"nearest", "linear"}
    */
    App.prototype.SetMagFilter = function (magFilter) {
        this.view3D.SetMagFilter(magFilter);
        this.magFilter = magFilter;
    };
    /**Setzt den Minification-Filter für die 3D-Ansicht
    *@param minFilter  Minification-Filter {"nearest", "linear", "nmmn", "nmml", "lmmn", "lmml"}
    */
    App.prototype.SetMinFilter = function (minFilter) {
        this.view3D.SetMinFilter(minFilter);
        this.minFilter = minFilter;
    };
    /**Setzt Anisotropic-Filter für die 3D-Ansicht
    *@param anisotropic  Anisotropic-Filter {0, 2, 4, 8, 16}. 0=Off
    */
    App.prototype.SetAnisotropic = function (anisotropic) {
        if (this.view3D.SetAnisotropic(anisotropic))
            this.anisotropic = anisotropic;
    };
    return App;
}());
//# sourceMappingURL=app.js.map