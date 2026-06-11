;(function (global) {
  'use strict';

  const O = global.Obsidian;
  if (!O) return;
  const Vec3 = O.Vec3, Color = O.Color, Mat4 = O.Mat4, Quat = O.Quat, EventEmitter = O.EventEmitter;

  // ============================================================
  // WEBGL2 CONTEXT WRAPPER
  // ============================================================
  function GLContext(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    if (!this.gl) throw new Error('WebGL2 not supported');
    const gl = this.gl;
    this.ext = {};
    this.state = {
      cullFace: false, blend: false, depthTest: true, depthWrite: true,
      frontFace: gl.CCW, cullFaceMode: gl.BACK, blendSrc: gl.SRC_ALPHA, blendDst: gl.ONE_MINUS_SRC_ALPHA
    };
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    this._width = 0; this._height = 0;
    this._clearColor = new Color(0, 0, 0, 1);
  }

  GLContext.prototype.resize = function (w, h) {
    if (this._width === w && this._height === h) return;
    this._width = w; this._height = h;
    this.canvas.width = w; this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  };

  GLContext.prototype.extension = function (name) {
    return this.ext[name] || (this.ext[name] = this.gl.getExtension(name));
  };

  GLContext.prototype.clear = function (r, g, b, a) {
    const gl = this.gl;
    if (r !== undefined) { this._clearColor.set(r, g, b, a); gl.clearColor(r, g, b, a !== undefined ? a : 1); }
    else gl.clearColor(this._clearColor.r, this._clearColor.g, this._clearColor.b, this._clearColor.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  };

  GLContext.prototype.setDepthTest = function (v) { if (this.state.depthTest !== v) { this.state.depthTest = v; (v ? this.gl.enable : this.gl.disable).call(this.gl, this.gl.DEPTH_TEST); } };
  GLContext.prototype.setDepthWrite = function (v) { this.state.depthWrite = v; this.gl.depthMask(v); };
  GLContext.prototype.setCullFace = function (v) { if (this.state.cullFace !== v) { this.state.cullFace = v; (v ? this.gl.enable : this.gl.disable).call(this.gl, this.gl.CULL_FACE); } };
  GLContext.prototype.setBlend = function (v) { if (this.state.blend !== v) { this.state.blend = v; (v ? this.gl.enable : this.gl.disable).call(this.gl, this.gl.BLEND); } };

  // ============================================================
  // SHADER
  // ============================================================
  function Shader(gl, vsSrc, fsSrc) {
    this.gl = gl;
    this.program = gl.createProgram();
    this._uniforms = {};
    this._attributes = {};

    const vs = this._compile(gl.VERTEX_SHADER, vsSrc);
    const fs = this._compile(gl.FRAGMENT_SHADER, fsSrc);
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.bindAttribLocation(this.program, 0, 'position');
    gl.bindAttribLocation(this.program, 1, 'normal');
    gl.bindAttribLocation(this.program, 2, 'uv');
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error('Shader link error: ' + gl.getProgramInfoLog(this.program));
    }
    gl.deleteShader(vs); gl.deleteShader(fs);
  }

  Shader.prototype._compile = function (type, src) {
    const gl = this.gl;
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('Shader compile error: ' + gl.getShaderInfoLog(s));
    }
    return s;
  };

  Shader.prototype.bind = function () { this.gl.useProgram(this.program); };
  Shader.prototype.unbind = function () { this.gl.useProgram(null); };

  Shader.prototype.uniform = function (name) {
    if (!this._uniforms[name]) this._uniforms[name] = this.gl.getUniformLocation(this.program, name);
    return this._uniforms[name];
  };

  Shader.prototype.attribute = function (name) {
    if (!this._attributes[name]) this._attributes[name] = this.gl.getAttribLocation(this.program, name);
    return this._attributes[name];
  };

  Shader.prototype.setFloat = function (name, v) { this.gl.uniform1f(this.uniform(name), v); };
  Shader.prototype.setInt = function (name, v) { this.gl.uniform1i(this.uniform(name), v); };
  Shader.prototype.setVec2 = function (name, x, y) { this.gl.uniform2f(this.uniform(name), x, y); };
  Shader.prototype.setVec3 = function (name, x, y, z) { this.gl.uniform3f(this.uniform(name), x, y, z); };
  Shader.prototype.setVec4 = function (name, x, y, z, w) { this.gl.uniform4f(this.uniform(name), x, y, z, w); };
  Shader.prototype.setMat4 = function (name, m) { this.gl.uniformMatrix4fv(this.uniform(name), false, m._ || m); };
  Shader.prototype.setMat3 = function (name, m) { this.gl.uniformMatrix3fv(this.uniform(name), false, m._ || m); };
  Shader.prototype.setColor = function (name, c) { this.gl.uniform4f(this.uniform(name), c.r, c.g, c.b, c.a); };

  // ============================================================
  // GEOMETRY
  // ============================================================
  function Geometry() {
    this.attributes = {};
    this.index = null;
    this.vertexCount = 0;
    this.indexCount = 0;
    this._vao = null;
    this._gl = null;
  }

  Geometry.prototype.setAttribute = function (name, data, size, type, normalized, stride, offset) {
    this.attributes[name] = { data, size: size || 3, type: type || Float32Array, normalized: normalized || false, stride: stride || 0, offset: offset || 0 };
    if (data.length) this.vertexCount = Math.max(this.vertexCount, data.length / (size || 3));
    return this;
  };

  Geometry.prototype.setIndex = function (data) {
    this.index = data;
    this.indexCount = data.length;
    return this;
  };

  Geometry.prototype._upload = function (gl) {
    if (this._vao && this._gl === gl) return;
    this._gl = gl;
    this._vao = gl.createVertexArray();
    gl.bindVertexArray(this._vao);

    const attrNames = Object.keys(this.attributes);
    attrNames.forEach((name, i) => {
      const attr = this.attributes[name];
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, attr.data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, attr.size, attr.data instanceof Float32Array ? gl.FLOAT : gl.UNSIGNED_SHORT, attr.normalized, attr.stride, attr.offset);
    });

    if (this.index) {
      this._ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.index, gl.STATIC_DRAW);
    }

    gl.bindVertexArray(null);
  };

  Geometry.prototype.bind = function (gl) {
    this._upload(gl);
    gl.bindVertexArray(this._vao);
  };

  Geometry.prototype.unbind = function (gl) {
    gl.bindVertexArray(null);
  };

  Geometry.prototype.draw = function (gl, mode) {
    this.bind(gl);
    if (this.index) {
      gl.drawElements(mode || gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(mode || gl.TRIANGLES, 0, this.vertexCount);
    }
  };

  // ============================================================
  // BUILT-IN GEOMETRIES
  // ============================================================
  function createBox(w, h, d) {
    w = w || 1; h = h || 1; d = d || 1;
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const positions = new Float32Array([
      -hw, -hh, -hd,  hw, -hh, -hd,  hw,  hh, -hd,  -hw,  hh, -hd,
      -hw, -hh,  hd,  hw, -hh,  hd,  hw,  hh,  hd,  -hw,  hh,  hd,
      -hw, -hh, -hd, -hw, -hh,  hd, -hw,  hh,  hd, -hw,  hh, -hd,
       hw, -hh, -hd,  hw, -hh,  hd,  hw,  hh,  hd,  hw,  hh, -hd,
      -hw, -hh, -hd,  hw, -hh, -hd,  hw, -hh,  hd, -hw, -hh,  hd,
      -hw,  hh, -hd,  hw,  hh, -hd,  hw,  hh,  hd, -hw,  hh,  hd
    ]);
    const normals = new Float32Array([
       0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,
       0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,
      -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0,
       1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,
       0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,
       0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0
    ]);
    const uvs = new Float32Array([
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1
    ]);
    const indices = new Uint16Array([
      0,1,2, 0,2,3, 4,5,6, 4,6,7,
      8,9,10, 8,10,11, 12,13,14, 12,14,15,
      16,17,18, 16,18,19, 20,21,22, 20,22,23
    ]);
    const g = new Geometry();
    g.setAttribute('position', positions, 3);
    g.setAttribute('normal', normals, 3);
    g.setAttribute('uv', uvs, 2);
    g.setIndex(indices);
    return g;
  }

  function createSphere(radius, segments) {
    segments = segments || 24;
    const positions = [], normals = [], uvs = [], indices = [];
    for (let j = 0; j <= segments; j++) {
      const theta = j * Math.PI / segments;
      const sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);
      for (let i = 0; i <= segments; i++) {
        const phi = i * 2 * Math.PI / segments;
        const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
        const x = cosPhi * sinTheta, y = cosTheta, z = sinPhi * sinTheta;
        positions.push(x * radius, y * radius, z * radius);
        normals.push(x, y, z);
        uvs.push(i / segments, j / segments);
      }
    }
    for (let j = 0; j < segments; j++) {
      for (let i = 0; i < segments; i++) {
        const a = j * (segments + 1) + i;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const g = new Geometry();
    g.setAttribute('position', new Float32Array(positions), 3);
    g.setAttribute('normal', new Float32Array(normals), 3);
    g.setAttribute('uv', new Float32Array(uvs), 2);
    g.setIndex(new Uint16Array(indices));
    return g;
  }

  function createPlane(w, h) {
    w = w || 1; h = h || 1;
    const positions = new Float32Array([-w/2, -h/2, 0,  w/2, -h/2, 0,  w/2,  h/2, 0, -w/2,  h/2, 0]);
    const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    const g = new Geometry();
    g.setAttribute('position', positions, 3);
    g.setAttribute('normal', normals, 3);
    g.setAttribute('uv', uvs, 2);
    g.setIndex(indices);
    return g;
  }

  // ============================================================
  // MATERIAL
  // ============================================================
  function Material(options) {
    options = options || {};
    this.color = options.color ? new Color().hex(options.color) : new Color(1, 1, 1, 1);
    this.metalness = options.metalness || 0;
    this.roughness = options.roughness !== undefined ? options.roughness : 1;
    this.emissive = new Color(0, 0, 0, 1);
    this.emissiveIntensity = options.emissiveIntensity || 0;
    this.alphaTest = options.alphaTest || 0;
    this.transparent = options.transparent || false;
    this.side = options.side || 'front';
    this.map = null;
    this.normalMap = null;
    this.roughnessMap = null;
    this.metalnessMap = null;
    this.aoMap = null;
    this.emissiveMap = null;
  }

  // ============================================================
  // MESH
  // ============================================================
  function Mesh(geometry, material) {
    Node.call(this);
    this.geometry = geometry;
    this.material = material || new Material();
    this.visible = true;
    this.castShadow = true;
    this.receiveShadow = true;
  }
  Mesh.prototype = Object.create(Node.prototype);
  Mesh.prototype.constructor = Mesh;

  // ============================================================
  // TRANSFORM NODE
  // ============================================================
  function Node() {
    this.position = new Vec3();
    this.rotation = new Quat();
    this.scale = new Vec3(1, 1, 1);
    this._matrix = new Mat4();
    this._worldMatrix = new Mat4();
    this._dirty = true;
    this._worldDirty = true;
    this.parent = null;
    this.children = [];
    this.name = '';
  }

  Node.prototype.setPosition = function (x, y, z) { this.position.set(x, y, z); this._dirty = true; return this; };
  Node.prototype.setScale = function (x, y, z) { this.scale.set(x || 1, y || 1, z || 1); this._dirty = true; return this; };
  Node.prototype.lookAt = function (target) {
    const m = new Mat4().lookAt(this.position, target, Vec3.UP);
    const q = new Quat();
    const trace = m._[0] + m._[5] + m._[10];
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      q._[3] = 0.25 / s;
      q._[0] = (m._[6] - m._[9]) * s;
      q._[1] = (m._[8] - m._[2]) * s;
      q._[2] = (m._[1] - m._[4]) * s;
    } else if (m._[0] > m._[5] && m._[0] > m._[10]) {
      const s = 2 * Math.sqrt(1 + m._[0] - m._[5] - m._[10]);
      q._[3] = (m._[6] - m._[9]) / s;
      q._[0] = 0.25 * s;
      q._[1] = (m._[4] + m._[1]) / s;
      q._[2] = (m._[8] + m._[2]) / s;
    } else if (m._[5] > m._[10]) {
      const s = 2 * Math.sqrt(1 + m._[5] - m._[0] - m._[10]);
      q._[3] = (m._[8] - m._[2]) / s;
      q._[0] = (m._[4] + m._[1]) / s;
      q._[1] = 0.25 * s;
      q._[2] = (m._[9] + m._[6]) / s;
    } else {
      const s = 2 * Math.sqrt(1 + m._[10] - m._[0] - m._[5]);
      q._[3] = (m._[1] - m._[4]) / s;
      q._[0] = (m._[8] + m._[2]) / s;
      q._[1] = (m._[9] + m._[6]) / s;
      q._[2] = 0.25 * s;
    }
    q._[0] = -q._[0]; q._[1] = -q._[1]; q._[2] = -q._[2];
    this.rotation.copy(q);
    this._dirty = true;
    return this;
  };

  Node.prototype.add = function (child) {
    if (child.parent) child.parent.remove(child);
    this.children.push(child);
    child.parent = this;
    child._worldDirty = true;
    return this;
  };

  Node.prototype.remove = function (child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) { this.children.splice(idx, 1); child.parent = null; }
    return this;
  };

  Node.prototype.updateMatrix = function () {
    if (!this._dirty && !this._worldDirty) return this._matrix;
    this._matrix.compose(this.position, this.rotation._, this.scale);
    this._dirty = false;
    return this._matrix;
  };

  Node.prototype.updateWorldMatrix = function () {
    this.updateMatrix();
    if (this.parent) {
      this._worldMatrix.multiply(this.parent._worldMatrix, this._matrix);
    } else {
      this._worldMatrix.copy(this._matrix);
    }
    this._worldDirty = false;
    for (let i = 0; i < this.children.length; i++) {
      this.children[i]._worldDirty = true;
      this.children[i].updateWorldMatrix();
    }
    return this._worldMatrix;
  };

  // ============================================================
  // CAMERA
  // ============================================================
  function Camera(fov, aspect, near, far) {
    Node.call(this);
    this.fov = fov || 60;
    this.aspect = aspect || 16 / 9;
    this.near = near || 0.1;
    this.far = far || 1000;
    this._projection = new Mat4();
    this.updateProjection();
  }

  Camera.prototype = Object.create(Node.prototype);
  Camera.prototype.constructor = Camera;

  Camera.prototype.updateProjection = function () {
    this._projection.perspective(this.fov * Math.PI / 180, this.aspect, this.near, this.far);
    return this;
  };

  Camera.prototype.getViewMatrix = function (out) {
    const m = this.updateWorldMatrix();
    return (out || new Mat4()).copy(m).invert();
  };

  // ============================================================
  // LIGHT
  // ============================================================
  function Light(type, color, intensity) {
    Node.call(this);
    this.lightType = type || 'directional';
    this.color = color ? new Color().hex(color) : new Color(1, 1, 1, 1);
    this.intensity = intensity !== undefined ? intensity : 1;
  }

  Light.prototype = Object.create(Node.prototype);
  Light.prototype.constructor = Light;

  // ============================================================
  // SCENE
  // ============================================================
  function Scene() {
    Node.call(this);
    this.clearColor = new Color(0, 0, 0, 1);
    this.fogColor = new Color(0, 0, 0, 1);
    this.fogNear = 100;
    this.fogFar = 500;
    this.ambientLight = new Color(0.2, 0.2, 0.2, 1);
    this._lights = [];
    this._meshes = [];
  }

  Scene.prototype = Object.create(Node.prototype);
  Scene.prototype.constructor = Scene;

  Scene.prototype.add = function (child) {
    Node.prototype.add.call(this, child);
    this._collect(child);
    return this;
  };

  Scene.prototype._collect = function (node) {
    if (node instanceof Light) { this._lights.push(node); return; }
    if (node instanceof Mesh) { this._meshes.push(node); return; }
    if (node instanceof Node) {
      for (let i = 0; i < node.children.length; i++) this._collect(node.children[i]);
    }
  };

  // ============================================================
  // DEFAULT SHADERS
  // ============================================================
  const Shaders = {
    pbr: {
      vert: [
        'precision highp float;',
        'attribute vec3 position;',
        'attribute vec3 normal;',
        'attribute vec2 uv;',
        'uniform mat4 uProjection;',
        'uniform mat4 uView;',
        'uniform mat4 uModel;',
        'uniform mat3 uNormalMatrix;',
        'varying vec3 vNormal;',
        'varying vec3 vPosition;',
        'varying vec2 vUv;',
        'void main(void) {',
        '  vec4 wp = uModel * vec4(position, 1.0);',
        '  vPosition = wp.xyz;',
        '  vNormal = normalize(uNormalMatrix * normal);',
        '  vUv = uv;',
        '  gl_Position = uProjection * uView * wp;',
        '}'
      ].join('\n'),
      frag: [
        'precision highp float;',
        'varying vec3 vNormal;',
        'varying vec3 vPosition;',
        'varying vec2 vUv;',
        'uniform vec4 uColor;',
        'uniform float uMetalness;',
        'uniform float uRoughness;',
        'uniform vec4 uAmbient;',
        'uniform vec3 uCamPos;',
        'uniform vec4 uFogColor;',
        'uniform float uFogNear;',
        'uniform float uFogFar;',
        'void main(void) {',
        '  vec3 N = normalize(vNormal);',
        '  vec3 V = normalize(uCamPos - vPosition);',
        '  float diff = max(dot(N, vec3(0.0, 1.0, 0.0)), 0.0) * 0.5 + 0.5;',
        '  vec3 base = uColor.rgb * (uAmbient.rgb + diff);',
        '  float dist = length(vPosition - uCamPos);',
        '  float fog = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);',
        '  gl_FragColor = vec4(mix(base, uFogColor.rgb, fog), uColor.a);',
        '}'
      ].join('\n')
    }
  };

  // ============================================================
  // RENDERER
  // ============================================================
  function Renderer(canvas) {
    this.gl = new GLContext(canvas);
    this._scene = null;
    this._camera = null;
    this._clock = new global.Obsidian.Clock();
    this._shaders = {};
    this._viewMatrix = new Mat4();
    this._normalMatrix = new Float32Array(9);
    this._targetFPS = 120;
    this._frameInterval = 1000 / this._targetFPS;
    this._lastFrameTime = 0;

    this._running = false;
    this._animFrame = null;
    this._onBeforeRender = null;
    this._onAfterRender = null;
  }

  Renderer.prototype.setScene = function (scene) { this._scene = scene; return this; };
  Renderer.prototype.setCamera = function (camera) { this._camera = camera; return this; };
  Renderer.prototype.onBeforeRender = function (fn) { this._onBeforeRender = fn; return this; };
  Renderer.prototype.onAfterRender = function (fn) { this._onAfterRender = fn; return this; };
  Renderer.prototype.setTargetFPS = function (fps) { this._targetFPS = fps || 120; this._frameInterval = 1000 / this._targetFPS; return this; };
  Renderer.prototype._shader = function (name) {
    if (!this._shaders[name]) this._shaders[name] = new Shader(this.gl.gl, Shaders[name].vert, Shaders[name].frag);
    return this._shaders[name];
  };

  Renderer.prototype.render = function () {
    const gl = this.gl;
    const scene = this._scene;
    const camera = this._camera;
    if (!scene || !camera) return;

    const w = gl.canvas.clientWidth, h = gl.canvas.clientHeight;
    gl.resize(w, h);
    camera.aspect = w / h;
    camera.updateProjection();

    gl.clear(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b, scene.clearColor.a);
    gl.setDepthTest(true);
    gl.setCullFace(true);

    scene.updateWorldMatrix();
    const viewMatrix = camera.getViewMatrix(this._viewMatrix);
    const projMatrix = camera._projection;

    const shader = this._shader('pbr');
    shader.bind();
    shader.setMat4('uProjection', projMatrix);
    shader.setMat4('uView', viewMatrix);
    shader.setVec3('uCamPos', camera.position.x, camera.position.y, camera.position.z);
    shader.setColor('uAmbient', scene.ambientLight);
    shader.setColor('uFogColor', scene.fogColor);
    shader.setFloat('uFogNear', scene.fogNear);
    shader.setFloat('uFogFar', scene.fogFar);

    for (let i = 0; i < scene._meshes.length; i++) {
      const mesh = scene._meshes[i];
      if (!mesh.visible || !mesh.geometry) continue;

      const modelMatrix = mesh._worldMatrix || (mesh.updateWorldMatrix ? mesh.updateWorldMatrix() : mesh._worldMatrix);
      shader.setMat4('uModel', modelMatrix);

      const normalMatrix = this._normalMatrix;
      const m = modelMatrix._;
      const a00 = m[0], a01 = m[1], a02 = m[2];
      const a10 = m[4], a11 = m[5], a12 = m[6];
      const a20 = m[8], a21 = m[9], a22 = m[10];
      const det = a00 * (a11 * a22 - a12 * a21) - a01 * (a10 * a22 - a12 * a20) + a02 * (a10 * a21 - a11 * a20);
      if (det) {
        const inv = 1 / det;
        normalMatrix[0] = (a11 * a22 - a12 * a21) * inv;
        normalMatrix[1] = (a02 * a21 - a01 * a22) * inv;
        normalMatrix[2] = (a01 * a12 - a02 * a11) * inv;
        normalMatrix[3] = (a12 * a20 - a10 * a22) * inv;
        normalMatrix[4] = (a00 * a22 - a02 * a20) * inv;
        normalMatrix[5] = (a02 * a10 - a00 * a12) * inv;
        normalMatrix[6] = (a10 * a21 - a11 * a20) * inv;
        normalMatrix[7] = (a01 * a20 - a00 * a21) * inv;
        normalMatrix[8] = (a00 * a11 - a01 * a10) * inv;
      }
      shader.setMat3('uNormalMatrix', { _: normalMatrix });

      const mat = mesh.material;
      shader.setColor('uColor', mat.color);
      shader.setFloat('uMetalness', mat.metalness);
      shader.setFloat('uRoughness', mat.roughness);

      mesh.geometry.draw(gl.gl);
    }

    shader.unbind();
  };

  Renderer.prototype.start = function () {
    if (this._running) return;
    this._running = true;
    const loop = (now) => {
      if (!this._running) return;
      if (this._lastFrameTime && now - this._lastFrameTime < this._frameInterval - 0.25) {
        this._animFrame = requestAnimationFrame(loop);
        return;
      }
      this._lastFrameTime = now;
      this._clock.tick();
      if (this._onBeforeRender) this._onBeforeRender(this._clock);
      this.render();
      if (this._onAfterRender) this._onAfterRender(this._clock);
      this._animFrame = requestAnimationFrame(loop);
    };
    loop();
  };

  Renderer.prototype.stop = function () {
    this._running = false;
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
  };

  // ============================================================
  // PARTICLE SYSTEM (GPU-Instanced)
  // ============================================================
  function ParticleSystem(maxCount) {
    this.maxCount = maxCount || 1000;
    this.particles = [];
    this._count = 0;
    this._geometry = null;
    this._texture = null;
  }

  ParticleSystem.prototype.emit = function (count, options) {
    options = options || {};
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxCount) break;
      this.particles.push({
        position: new Vec3(options.x || 0, options.y || 0, options.z || 0),
        velocity: new Vec3(
          (Math.random() - 0.5) * (options.speed || 1),
          (Math.random() - 0.5) * (options.speed || 1),
          (Math.random() - 0.5) * (options.speed || 1)
        ),
        life: options.life || 1,
        maxLife: options.life || 1,
        size: options.size || 1,
        color: new Color(1, 1, 1, 1)
      });
    }
  };

  ParticleSystem.prototype.update = function (dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;
      p.life -= dt;
      p.color.a = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  };

  // ============================================================
  // EXPORTS
  // ============================================================
  O.GLContext = GLContext;
  O.Shader = Shader;
  O.Geometry = Geometry;
  O.Material = Material;
  O.Mesh = Mesh;
  O.Node = Node;
  O.Camera = Camera;
  O.Light = Light;
  O.Scene = Scene;
  O.Renderer = Renderer;
  O.ParticleSystem = ParticleSystem;
  O.GeometryUtils = { box: createBox, sphere: createSphere, plane: createPlane };

})(typeof window !== 'undefined' ? window : this);
