import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

/**
 * Stylised contour lines from the depth buffer (orthographic camera ⇒ depth is linear).
 *  - Silhouettes: a neighbour much farther away than this pixel → outline on the front object.
 *  - Creases: the depth's second derivative is non-zero where two faces meet at a fold — this is
 *    what marks ledges seen face-on, where depth itself is continuous.
 * Reads the depth texture attached to the composer's render targets.
 */
export class DepthEdgePass extends Pass {
  private quad: FullScreenQuad;
  readonly material: THREE.ShaderMaterial;

  constructor(camera: THREE.OrthographicCamera) {
    super();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        texel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
        range: { value: camera.far - camera.near },
        strength: { value: 0.75 },
        silhouette: { value: 0.35 },
        crease: { value: 0.035 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform vec2 texel;
        uniform float range;
        uniform float strength;
        uniform float silhouette;
        uniform float crease;
        varying vec2 vUv;
        float d(vec2 o) { return texture2D(tDepth, vUv + o * texel).x * range; }
        void main() {
          vec4 col = texture2D(tDiffuse, vUv);
          float c = d(vec2(0.0));
          if (c >= range * 0.9999) { gl_FragColor = col; return; } // background
          float l = d(vec2(-1.0, 0.0)), r = d(vec2(1.0, 0.0));
          float u = d(vec2(0.0, 1.0)), b = d(vec2(0.0, -1.0));
          // Silhouette: this pixel is in front of a neighbour by more than the threshold.
          float far = max(max(l, r), max(u, b)) - c;
          float sil = smoothstep(silhouette, silhouette * 2.0, far);
          // Crease: second difference (flat planes are exactly linear in ortho depth).
          float lap = abs(l + r - 2.0 * c) + abs(u + b - 2.0 * c);
          float cre = smoothstep(crease, crease * 2.5, lap) * (1.0 - step(silhouette, far));
          float e = max(sil, cre * 0.7) * strength;
          gl_FragColor = vec4(mix(col.rgb, col.rgb * 0.28, e), col.a);
        }`,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  setSize(width: number, height: number) {
    this.material.uniforms.texel.value.set(1 / Math.max(1, width), 1 / Math.max(1, height));
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    this.material.uniforms.tDepth.value = readBuffer.depthTexture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
}
