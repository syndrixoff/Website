;(function (global) {
  'use strict';

  // ============================================================
  // OBSIDIAN ENGINE — Custom Web Engine
  // V8 heap-snapshot ready. Zero top-level side effects.
  // ============================================================

  const O = { version: '0.1.0' };

  // ─── CLOCK ───────────────────────────────────────────────────
  function Clock() {
    this._start = performance.now();
    this._last = this._start;
    this.delta = 0.016;
    this.elapsed = 0;
    this.fps = 60;
    this._frames = 0;
    this._fpsTime = 0;
  }

  Clock.prototype.tick = function () {
    const now = performance.now();
    this.delta = Math.min((now - this._last) / 1000, 0.05);
    this._last = now;
    this.elapsed = (now - this._start) / 1000;
    this._frames++;
    this._fpsTime += this.delta;
    if (this._fpsTime >= 1) {
      this.fps = this._frames;
      this._frames = 0;
      this._fpsTime = 0;
    }
    return this.delta;
  };

  // ─── VEC2 ────────────────────────────────────────────────────
  function Vec2(x, y) { this.x = x || 0; this.y = y || 0; }

  Vec2.prototype.set = function (x, y) { this.x = x; this.y = y; return this; };
  Vec2.prototype.copy = function (v) { this.x = v.x; this.y = v.y; return this; };
  Vec2.prototype.clone = function () { return new Vec2(this.x, this.y); };
  Vec2.prototype.add = function (v) { this.x += v.x; this.y += v.y; return this; };
  Vec2.prototype.sub = function (v) { this.x -= v.x; this.y -= v.y; return this; };
  Vec2.prototype.scale = function (s) { this.x *= s; this.y *= s; return this; };
  Vec2.prototype.len = function () { return Math.sqrt(this.x * this.x + this.y * this.y); };
  Vec2.prototype.lenSq = function () { return this.x * this.x + this.y * this.y; };
  Vec2.prototype.normalize = function () { const l = this.len() || 1; this.x /= l; this.y /= l; return this; };
  Vec2.prototype.dot = function (v) { return this.x * v.x + this.y * v.y; };
  Vec2.prototype.dist = function (v) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2); };
  Vec2.prototype.lerp = function (v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; return this; };

  // ─── VEC3 ────────────────────────────────────────────────────
  function Vec3(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; }

  Vec3.prototype.set = function (x, y, z) { this.x = x; this.y = y; this.z = z; return this; };
  Vec3.prototype.copy = function (v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; };
  Vec3.prototype.clone = function () { return new Vec3(this.x, this.y, this.z); };
  Vec3.prototype.add = function (v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; };
  Vec3.prototype.sub = function (v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; };
  Vec3.prototype.scale = function (s) { this.x *= s; this.y *= s; this.z *= s; return this; };
  Vec3.prototype.len = function () { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); };
  Vec3.prototype.lenSq = function () { return this.x * this.x + this.y * this.y + this.z * this.z; };
  Vec3.prototype.normalize = function () { const l = this.len() || 1; this.x /= l; this.y /= l; this.z /= l; return this; };
  Vec3.prototype.dot = function (v) { return this.x * v.x + this.y * v.y + this.z * v.z; };
  Vec3.prototype.cross = function (v) { const x = this.y * v.z - this.z * v.y; const y = this.z * v.x - this.x * v.z; const z = this.x * v.y - this.y * v.x; this.x = x; this.y = y; this.z = z; return this; };
  Vec3.prototype.dist = function (v) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2); };
  Vec3.prototype.lerp = function (v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; };
  Vec3.prototype.applyMat4 = function (m) {
    const x = this.x, y = this.y, z = this.z;
    const d = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
    this.x = (m[0] * x + m[4] * y + m[8] * z + m[12]) / d;
    this.y = (m[1] * x + m[5] * y + m[9] * z + m[13]) / d;
    this.z = (m[2] * x + m[6] * y + m[10] * z + m[14]) / d;
    return this;
  };
  Vec3.prototype.applyQuat = function (q) {
    const x = this.x, y = this.y, z = this.z;
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
  };
  Vec3.ZERO = new Vec3(0, 0, 0);
  Vec3.UP = new Vec3(0, 1, 0);

  // ─── VEC4 ────────────────────────────────────────────────────
  function Vec4(x, y, z, w) { this.x = x || 0; this.y = y || 0; this.z = z || 0; this.w = w || 0; }

  Vec4.prototype.set = function (x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; };
  Vec4.prototype.copy = function (v) { this.x = v.x; this.y = v.y; this.z = v.z; this.w = v.w; return this; };
  Vec4.prototype.clone = function () { return new Vec4(this.x, this.y, this.z, this.w); };

  // ─── COLOR ───────────────────────────────────────────────────
  function Color(r, g, b, a) {
    if (typeof r === 'string') { this.hex(r); return; }
    this.r = r || 0; this.g = g || 0; this.b = b || 0; this.a = a !== undefined ? a : 1;
  }

  Color.prototype.set = function (r, g, b, a) { this.r = r; this.g = g; this.b = b; this.a = a !== undefined ? a : this.a; return this; };
  Color.prototype.copy = function (c) { this.r = c.r; this.g = c.g; this.b = c.b; this.a = c.a; return this; };
  Color.prototype.clone = function () { return new Color(this.r, this.g, this.b, this.a); };
  Color.prototype.hex = function (h) {
    if (typeof h === 'number') {
      this.r = ((h >> 16) & 0xFF) / 255;
      this.g = ((h >> 8) & 0xFF) / 255;
      this.b = (h & 0xFF) / 255;
      this.a = 1;
    } else {
      const s = h.replace('#', '');
      this.r = parseInt(s.substring(0, 2), 16) / 255;
      this.g = parseInt(s.substring(2, 4), 16) / 255;
      this.b = parseInt(s.substring(4, 6), 16) / 255;
      this.a = s.length === 8 ? parseInt(s.substring(6, 8), 16) / 255 : 1;
    }
    return this;
  };
  Color.prototype.toHex = function () {
    const r = Math.round(this.r * 255), g = Math.round(this.g * 255), b = Math.round(this.b * 255);
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
  };
  Color.prototype.lerp = function (c, t) {
    this.r += (c.r - this.r) * t;
    this.g += (c.g - this.g) * t;
    this.b += (c.b - this.b) * t;
    this.a += (c.a - this.a) * t;
    return this;
  };
  Color.prototype.toArray = function () { return [this.r, this.g, this.b, this.a]; };

  // ─── MAT4 ────────────────────────────────────────────────────
  // Column-major 4x4 matrix (16-element Float32Array)
  function Mat4() { this._ = new Float32Array(16); this.identity(); }

  Mat4.prototype.identity = function () {
    const m = this._;
    m[0] = 1; m[4] = 0; m[8] = 0; m[12] = 0;
    m[1] = 0; m[5] = 1; m[9] = 0; m[13] = 0;
    m[2] = 0; m[6] = 0; m[10] = 1; m[14] = 0;
    m[3] = 0; m[7] = 0; m[11] = 0; m[15] = 1;
    return this;
  };

  Mat4.prototype.copy = function (m) { this._.set(m._); return this; };
  Mat4.prototype.clone = function () { const m = new Mat4(); m._.set(this._); return m; };

  Mat4.prototype.multiply = function (a, b) {
    const a_ = a._, b_ = b._;
    const m = this._;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        m[j * 4 + i] = a_[0 * 4 + i] * b_[j * 4 + 0] +
                       a_[1 * 4 + i] * b_[j * 4 + 1] +
                       a_[2 * 4 + i] * b_[j * 4 + 2] +
                       a_[3 * 4 + i] * b_[j * 4 + 3];
      }
    }
    return this;
  };

  Mat4.prototype.transform = function (v) {
    const x = v.x, y = v.y, z = v.z, m = this._;
    const d = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
    return new Vec3(
      (m[0] * x + m[4] * y + m[8] * z + m[12]) / d,
      (m[1] * x + m[5] * y + m[9] * z + m[13]) / d,
      (m[2] * x + m[6] * y + m[10] * z + m[14]) / d
    );
  };

  Mat4.prototype.perspective = function (fov, aspect, near, far) {
    const t = Math.tan(fov / 2), d = far - near;
    const m = this._;
    m[0] = 1 / (aspect * t); m[1] = 0; m[2] = 0; m[3] = 0;
    m[4] = 0; m[5] = 1 / t; m[6] = 0; m[7] = 0;
    m[8] = 0; m[9] = 0; m[10] = -(far + near) / d; m[11] = -1;
    m[12] = 0; m[13] = 0; m[14] = -2 * far * near / d; m[15] = 0;
    return this;
  };

  Mat4.prototype.orthographic = function (l, r, b, t, n, f) {
    const m = this._;
    m[0] = 2 / (r - l); m[1] = 0; m[2] = 0; m[3] = 0;
    m[4] = 0; m[5] = 2 / (t - b); m[6] = 0; m[7] = 0;
    m[8] = 0; m[9] = 0; m[10] = -2 / (f - n); m[11] = 0;
    m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); m[15] = 1;
    return this;
  };

  Mat4.prototype.lookAt = function (eye, target, up) {
    const z = new Vec3(eye.x - target.x, eye.y - target.y, eye.z - target.z).normalize();
    const x = new Vec3().copy(up).cross(z).normalize();
    const y = new Vec3().copy(z).cross(x);
    const m = this._;
    m[0] = x.x; m[1] = y.x; m[2] = z.x; m[3] = 0;
    m[4] = x.y; m[5] = y.y; m[6] = z.y; m[7] = 0;
    m[8] = x.z; m[9] = y.z; m[10] = z.z; m[11] = 0;
    m[12] = -x.dot(eye); m[13] = -y.dot(eye); m[14] = -z.dot(eye); m[15] = 1;
    return this;
  };

  Mat4.prototype.translate = function (v) {
    const m = this._;
    m[12] += m[0] * v.x + m[4] * v.y + m[8] * v.z;
    m[13] += m[1] * v.x + m[5] * v.y + m[9] * v.z;
    m[14] += m[2] * v.x + m[6] * v.y + m[10] * v.z;
    return this;
  };

  Mat4.prototype.rotate = function (angle, axis) {
    const s = Math.sin(angle), c = Math.cos(angle), mc = 1 - c;
    const x = axis.x, y = axis.y, z = axis.z;
    const r = new Float32Array([
      c + x * x * mc, x * y * mc + z * s, x * z * mc - y * s, 0,
      x * y * mc - z * s, c + y * y * mc, y * z * mc + x * s, 0,
      x * z * mc + y * s, y * z * mc - x * s, c + z * z * mc, 0,
      0, 0, 0, 1
    ]);
    const rm = { _: r };
    this.multiply(this, rm);
    return this;
  };

  Mat4.prototype.scale = function (v) {
    const m = this._;
    m[0] *= v.x; m[1] *= v.x; m[2] *= v.x;
    m[4] *= v.y; m[5] *= v.y; m[6] *= v.y;
    m[8] *= v.z; m[9] *= v.z; m[10] *= v.z;
    return this;
  };

  Mat4.prototype.invert = function () {
    const m = this._;
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return this;
    const inv = 1 / det;
    this._[0] = (a11 * b11 - a12 * b10 + a13 * b09) * inv;
    this._[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * inv;
    this._[2] = (a31 * b05 - a32 * b04 + a33 * b03) * inv;
    this._[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * inv;
    this._[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * inv;
    this._[5] = (a00 * b11 - a02 * b08 + a03 * b07) * inv;
    this._[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * inv;
    this._[7] = (a20 * b05 - a22 * b02 + a23 * b01) * inv;
    this._[8] = (a10 * b10 - a11 * b08 + a13 * b06) * inv;
    this._[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * inv;
    this._[10] = (a30 * b04 - a31 * b02 + a33 * b00) * inv;
    this._[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * inv;
    this._[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * inv;
    this._[13] = (a00 * b09 - a01 * b07 + a02 * b06) * inv;
    this._[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * inv;
    this._[15] = (a20 * b03 - a21 * b01 + a22 * b00) * inv;
    return this;
  };

  Mat4.prototype.transpose = function () {
    const m = this._;
    let t;
    t = m[1]; m[1] = m[4]; m[4] = t;
    t = m[2]; m[2] = m[8]; m[8] = t;
    t = m[3]; m[3] = m[12]; m[12] = t;
    t = m[6]; m[6] = m[9]; m[9] = t;
    t = m[7]; m[7] = m[13]; m[13] = t;
    t = m[11]; m[11] = m[14]; m[14] = t;
    return this;
  };

  Mat4.prototype.compose = function (pos, quat, scale) {
    const len = Math.sqrt(quat[0] * quat[0] + quat[1] * quat[1] + quat[2] * quat[2] + quat[3] * quat[3]) || 1;
    const qx = quat[0] / len, qy = quat[1] / len, qz = quat[2] / len, qw = quat[3] / len;
    const sx = scale.x, sy = scale.y, sz = scale.z;
    const m = this._;
    m[0] = (1 - 2 * (qy * qy + qz * qz)) * sx;
    m[1] = (2 * (qx * qy + qw * qz)) * sx;
    m[2] = (2 * (qx * qz - qw * qy)) * sx;
    m[3] = 0;
    m[4] = (2 * (qx * qy - qw * qz)) * sy;
    m[5] = (1 - 2 * (qx * qx + qz * qz)) * sy;
    m[6] = (2 * (qy * qz + qw * qx)) * sy;
    m[7] = 0;
    m[8] = (2 * (qx * qz + qw * qy)) * sz;
    m[9] = (2 * (qy * qz - qw * qx)) * sz;
    m[10] = (1 - 2 * (qx * qx + qy * qy)) * sz;
    m[11] = 0;
    m[12] = pos.x; m[13] = pos.y; m[14] = pos.z; m[15] = 1;
    return this;
  };

  // ─── QUATERNION ──────────────────────────────────────────────
  function Quat(x, y, z, w) { this._ = new Float32Array([x || 0, y || 0, z || 0, w !== undefined ? w : 1]); }
  Object.defineProperty(Quat.prototype, 'x', { get: function () { return this._[0]; }, set: function (v) { this._[0] = v; } });
  Object.defineProperty(Quat.prototype, 'y', { get: function () { return this._[1]; }, set: function (v) { this._[1] = v; } });
  Object.defineProperty(Quat.prototype, 'z', { get: function () { return this._[2]; }, set: function (v) { this._[2] = v; } });
  Object.defineProperty(Quat.prototype, 'w', { get: function () { return this._[3]; }, set: function (v) { this._[3] = v; } });

  Quat.prototype.identity = function () { this._[0] = 0; this._[1] = 0; this._[2] = 0; this._[3] = 1; return this; };
  Quat.prototype.clone = function () { return new Quat(this._[0], this._[1], this._[2], this._[3]); };
  Quat.prototype.copy = function (q) { this._[0] = q._[0]; this._[1] = q._[1]; this._[2] = q._[2]; this._[3] = q._[3]; return this; };
  Quat.prototype.set = function (x, y, z, w) { this._[0] = x; this._[1] = y; this._[2] = z; this._[3] = w; return this; };

  Quat.prototype.multiply = function (a, b) {
    const ax = a._[0], ay = a._[1], az = a._[2], aw = a._[3];
    const bx = b._[0], by = b._[1], bz = b._[2], bw = b._[3];
    this._[0] = ax * bw + aw * bx + ay * bz - az * by;
    this._[1] = ay * bw + aw * by + az * bx - ax * bz;
    this._[2] = az * bw + aw * bz + ax * by - ay * bx;
    this._[3] = aw * bw - ax * bx - ay * by - az * bz;
    return this;
  };

  Quat.prototype.normalize = function () {
    const l = Math.sqrt(this._[0] ** 2 + this._[1] ** 2 + this._[2] ** 2 + this._[3] ** 2) || 1;
    this._[0] /= l; this._[1] /= l; this._[2] /= l; this._[3] /= l;
    return this;
  };

  Quat.prototype.fromAxisAngle = function (axis, angle) {
    const s = Math.sin(angle / 2);
    this._[0] = axis.x * s;
    this._[1] = axis.y * s;
    this._[2] = axis.z * s;
    this._[3] = Math.cos(angle / 2);
    return this;
  };

  Quat.prototype.slerp = function (q, t) {
    const ax = this._[0], ay = this._[1], az = this._[2], aw = this._[3];
    let bx = q._[0], by = q._[1], bz = q._[2], bw = q._[3];
    let cosHalfTheta = ax * bx + ay * by + az * bz + aw * bw;
    if (cosHalfTheta < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; cosHalfTheta = -cosHalfTheta; }
    if (cosHalfTheta >= 1) return this;
    const sinHalfTheta = Math.sqrt(1 - cosHalfTheta * cosHalfTheta);
    if (sinHalfTheta < 0.001) {
      this._[0] = ax * (1 - t) + bx * t;
      this._[1] = ay * (1 - t) + by * t;
      this._[2] = az * (1 - t) + bz * t;
      this._[3] = aw * (1 - t) + bw * t;
      return this.normalize();
    }
    const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
    const ra = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const rb = Math.sin(t * halfTheta) / sinHalfTheta;
    this._[0] = ax * ra + bx * rb;
    this._[1] = ay * ra + by * rb;
    this._[2] = az * ra + bz * rb;
    this._[3] = aw * ra + bw * rb;
    return this;
  };

  // ─── RAY ─────────────────────────────────────────────────────
  function Ray(origin, direction) {
    this.origin = origin || new Vec3();
    this.direction = direction || new Vec3(0, 0, -1);
  }

  Ray.prototype.set = function (origin, direction) { this.origin.copy(origin); this.direction.copy(direction); return this; };
  Ray.prototype.at = function (t, out) { out = out || new Vec3(); out.x = this.origin.x + this.direction.x * t; out.y = this.origin.y + this.direction.y * t; out.z = this.origin.z + this.direction.z * t; return out; };

  Ray.prototype.intersectSphere = function (center, radius) {
    const ox = this.origin.x - center.x;
    const oy = this.origin.y - center.y;
    const oz = this.origin.z - center.z;
    const dx = this.direction.x;
    const dy = this.direction.y;
    const dz = this.direction.z;
    const a = dx * dx + dy * dy + dz * dz;
    const b = 2 * (ox * dx + oy * dy + oz * dz);
    const c = ox * ox + oy * oy + oz * oz - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 ? t : -1;
  };

  Ray.prototype.intersectPlane = function (planeNormal, planeConstant) {
    const denom = this.direction.dot(planeNormal);
    if (Math.abs(denom) < 1e-6) return -1;
    const t = -(this.origin.dot(planeNormal) + planeConstant) / denom;
    return t >= 0 ? t : -1;
  };

  // ─── AABB ────────────────────────────────────────────────────
  function AABB(min, max) {
    this.min = min || new Vec3(Infinity, Infinity, Infinity);
    this.max = max || new Vec3(-Infinity, -Infinity, -Infinity);
  }

  AABB.prototype.copy = function (a) { this.min.copy(a.min); this.max.copy(a.max); return this; };
  AABB.prototype.clone = function () { return new AABB(this.min.clone(), this.max.clone()); };
  AABB.prototype.center = function (out) { out = out || new Vec3(); out.x = (this.min.x + this.max.x) / 2; out.y = (this.min.y + this.max.y) / 2; out.z = (this.min.z + this.max.z) / 2; return out; };
  AABB.prototype.size = function (out) { out = out || new Vec3(); out.x = this.max.x - this.min.x; out.y = this.max.y - this.min.y; out.z = this.max.z - this.min.z; return out; };
  AABB.prototype.expand = function (p) { if (p.x < this.min.x) this.min.x = p.x; if (p.y < this.min.y) this.min.y = p.y; if (p.z < this.min.z) this.min.z = p.z; if (p.x > this.max.x) this.max.x = p.x; if (p.y > this.max.y) this.max.y = p.y; if (p.z > this.max.z) this.max.z = p.z; return this; };
  AABB.prototype.isEmpty = function () { return this.min.x > this.max.x || this.min.y > this.max.y || this.min.z > this.max.z; };
  AABB.prototype.clear = function () { this.min.set(Infinity, Infinity, Infinity); this.max.set(-Infinity, -Infinity, -Infinity); return this; };

  // ─── EVENT EMITTER ───────────────────────────────────────────
  function EventEmitter() { this._listeners = {}; }

  EventEmitter.prototype.on = function (event, fn) {
    (this._listeners[event] = this._listeners[event] || []).push(fn);
    return this;
  };
  EventEmitter.prototype.off = function (event, fn) {
    const list = this._listeners[event];
    if (!list) return this;
    this._listeners[event] = list.filter(f => f !== fn);
    return this;
  };
  EventEmitter.prototype.emit = function (event, data) {
    const list = this._listeners[event];
    if (list) list.forEach(fn => fn(data));
    return this;
  };
  EventEmitter.prototype.once = function (event, fn) {
    const wrapper = (data) => { fn(data); this.off(event, wrapper); };
    this.on(event, wrapper);
    return this;
  };

  // ─── OBJECT POOL ─────────────────────────────────────────────
  function Pool(factory, reset, initialSize) {
    this._factory = factory;
    this._reset = reset;
    this._pool = [];
    this._active = [];
    for (let i = 0; i < (initialSize || 10); i++) this._pool.push(factory());
  }

  Pool.prototype.acquire = function () {
    const obj = this._pool.length ? this._pool.pop() : this._factory();
    this._active.push(obj);
    return obj;
  };

  Pool.prototype.release = function (obj) {
    const idx = this._active.indexOf(obj);
    if (idx < 0) return;
    this._active.splice(idx, 1);
    if (this._reset) this._reset(obj);
    this._pool.push(obj);
  };

  Pool.prototype.releaseAll = function () {
    for (let i = 0; i < this._active.length; i++) {
      const obj = this._active[i];
      if (this._reset) this._reset(obj);
      this._pool.push(obj);
    }
    this._active.length = 0;
  };

  // ─── EASING ──────────────────────────────────────────────────
  const Easing = {
    linear: t => t,
    quadIn: t => t * t,
    quadOut: t => t * (2 - t),
    quadInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    cubicIn: t => t * t * t,
    cubicOut: t => --t * t * t + 1,
    cubicInOut: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    quartIn: t => t * t * t * t,
    quartOut: t => 1 - --t * t * t * t,
    quartInOut: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
    quintIn: t => t * t * t * t * t,
    quintOut: t => 1 + --t * t * t * t * t,
    quintInOut: t => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,
    expoIn: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
    expoOut: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    expoInOut: t => {
      if (t === 0) return 0; if (t === 1) return 1;
      return t < 0.5 ? Math.pow(2, 10 * (2 * t - 1)) / 2 : (2 - Math.pow(2, -10 * (2 * t - 1))) / 2;
    },
    sineIn: t => 1 - Math.cos(t * Math.PI / 2),
    sineOut: t => Math.sin(t * Math.PI / 2),
    sineInOut: t => (1 - Math.cos(Math.PI * t)) / 2,
    circIn: t => 1 - Math.sqrt(1 - t * t),
    circOut: t => Math.sqrt(1 - --t * t),
    circInOut: t => t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - (2 * t - 2) * (2 * t - 2)) + 1) / 2,
    elasticIn: t => t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI),
    elasticOut: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1,
    elasticInOut: t => {
      if (t === 0) return 0; if (t === 1) return 1;
      return t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * 1.396)) / 2
                      : Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * 1.396) / 2 + 1;
    },
    backIn: t => t * t * (2.70158 * t - 1.70158),
    backOut: t => 1 + --t * t * (2.70158 * t + 1.70158),
    backInOut: t => {
      const s = 1.70158 * 1.525;
      return t < 0.5 ? t * t * ((s + 1) * 2 * t - s) / 2
                      : ((t - 1) * (t - 1) * ((s + 1) * (t - 1) * 2 + s) + 2) / 2;
    },
    bounceOut: t => {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    },
    bounceIn: t => 1 - Easing.bounceOut(1 - t),
    bounceInOut: t => t < 0.5 ? (1 - Easing.bounceOut(1 - 2 * t)) / 2 : (1 + Easing.bounceOut(2 * t - 1)) / 2,
    spring: t => (Math.pow(2, -10 * t) * Math.sin((t - 0.075) * 2 * Math.PI / 0.3) + 1)
  };

  // ─── TWEEN ───────────────────────────────────────────────────
  function Tween(target, prop, from, to, duration, easing) {
    this.target = target;
    this.prop = prop;
    this.from = from;
    this.to = to;
    this.duration = duration || 1;
    this.easing = typeof easing === 'string' ? Easing[easing] : (easing || Easing.linear);
    this.elapsed = 0;
    this.done = false;
    this._onUpdate = null;
    this._onComplete = null;
  }

  Tween.prototype.update = function (dt) {
    if (this.done) return;
    this.elapsed += dt;
    const t = Math.min(this.elapsed / this.duration, 1);
    const v = this.easing(t);
    this.target[this.prop] = this.from + (this.to - this.from) * v;
    if (this._onUpdate) this._onUpdate(this.target[this.prop], t);
    if (t >= 1) { this.done = true; if (this._onComplete) this._onComplete(); }
  };

  // ─── TIMELINE ────────────────────────────────────────────────
  function Timeline() {
    this._tweens = [];
    this._running = false;
    this._elapsed = 0;
    this._onComplete = null;
  }

  Timeline.prototype.add = function (tween, position) {
    if (position === undefined) position = this._tweens.length === 0 ? 0 : this._tweens[this._tweens.length - 1].end;
    const start = typeof position === 'number' ? position : this._elapsed;
    const end = start + tween.duration;
    this._tweens.push({ tween, start, end });
    return this;
  };

  Timeline.prototype.update = function (dt) {
    if (!this._running) return;
    this._elapsed += dt;
    let allDone = true;
    for (let i = 0; i < this._tweens.length; i++) {
      const t = this._tweens[i];
      if (t.tween.done) continue;
      const localT = this._elapsed - t.start;
      if (localT >= 0) {
        t.tween.update(dt);
        if (!t.tween.done) allDone = false;
      } else {
        allDone = false;
      }
    }
    if (allDone) { this._running = false; if (this._onComplete) this._onComplete(); }
  };

  Timeline.prototype.play = function () { this._running = true; return this; };
  Timeline.prototype.pause = function () { this._running = false; return this; };
  Timeline.prototype.reset = function () { this._running = false; this._elapsed = 0; this._tweens.forEach(t => t.tween.done = false); return this; };
  Timeline.prototype.onComplete = function (fn) { this._onComplete = fn; return this; };

  // ─── SPRING ──────────────────────────────────────────────────
  function Spring(mass, stiffness, damping) {
    this.mass = mass || 1;
    this.stiffness = stiffness || 100;
    this.damping = damping || 10;
    this.value = 0;
    this.velocity = 0;
    this.target = 0;
  }

  Spring.prototype.update = function (dt) {
    const f = -(this.value - this.target) * this.stiffness;
    const d = -this.velocity * this.damping;
    const a = (f + d) / this.mass;
    this.velocity += a * dt;
    this.value += this.velocity * dt;
    return this.value;
  };

  // ─── SCROLL CONTROLLER ───────────────────────────────────────
  function ScrollController() {
    this.sections = [];
    this._currentSection = -1;
    this._progress = 0;
    this._observer = null;
    this._onSectionChange = null;
    this._onProgress = null;
  }

  ScrollController.prototype.addSection = function (el, duration) {
    const section = { el, duration: duration || 1, progress: 0, enter: 0, leave: 1 };
    this.sections.push(section);
    return section;
  };

  ScrollController.prototype.init = function () {
    if (this._observer) this._observer.disconnect();
    this._observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const idx = this.sections.findIndex(s => s.el === entry.target);
        if (idx < 0) return;
        if (entry.isIntersecting) {
          this._currentSection = idx;
          const rect = entry.boundingClientRect;
          const parent = entry.rootBounds;
          const visible = rect.height / (parent ? parent.height : window.innerHeight);
          this.sections[idx].progress = Math.min(1, Math.max(0, visible));
          if (this._onSectionChange) this._onSectionChange(idx, this.sections[idx]);
        }
      });
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    this.sections.forEach(s => { if (s.el) this._observer.observe(s.el); });
    return this;
  };

  ScrollController.prototype.onSectionChange = function (fn) { this._onSectionChange = fn; return this; };

  // ─── LOADER ──────────────────────────────────────────────────
  function Loader() { this._loading = new Set(); }

  Loader.prototype.loadImage = function (url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  Loader.prototype.loadJSON = function (url) {
    return fetch(url).then(r => r.json());
  };

  Loader.prototype.loadBinary = function (url) {
    return fetch(url).then(r => r.arrayBuffer());
  };

  // ─── EXPORT ──────────────────────────────────────────────────
  O.Clock = Clock;
  O.Vec2 = Vec2;
  O.Vec3 = Vec3;
  O.Vec4 = Vec4;
  O.Color = Color;
  O.Mat4 = Mat4;
  O.Quat = Quat;
  O.Ray = Ray;
  O.AABB = AABB;
  O.EventEmitter = EventEmitter;
  O.Pool = Pool;
  O.Easing = Easing;
  O.Tween = Tween;
  O.Timeline = Timeline;
  O.Spring = Spring;
  O.ScrollController = ScrollController;
  O.Loader = Loader;

  global.Obsidian = O;

})(typeof window !== 'undefined' ? window : this);
