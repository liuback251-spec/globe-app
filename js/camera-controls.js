import * as THREE from 'three';

let animationId = null;

function shortestAnglePath(start, end) {
  let diff = end - start;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return start + diff;
}

export function flyToCountry(camera, controls, targetLon, targetLat, duration = 1800) {
  return new Promise((resolve) => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    controls.autoRotate = false;

    const targetTheta = -THREE.MathUtils.degToRad(targetLon);
    const targetPhi = THREE.MathUtils.degToRad(90 - targetLat);
    const distance = 2.0;

    const startSpherical = new THREE.Spherical().setFromVector3(camera.position);
    const startTheta = startSpherical.theta;
    const startPhi = startSpherical.phi;
    const startRadius = startSpherical.radius;

    const adjustedTheta = shortestAnglePath(startTheta, targetTheta);
    const startTime = performance.now();

    const _spherical = new THREE.Spherical();

    function animateStep(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      const ease = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const currentTheta = startTheta + (adjustedTheta - startTheta) * ease;
      const currentPhi = startPhi + (targetPhi - startPhi) * ease;
      const currentRadius = startRadius + (distance - startRadius) * ease;

      _spherical.set(currentRadius, currentPhi, currentTheta);
      camera.position.setFromSpherical(_spherical);
      controls.update();

      if (t < 1) {
        animationId = requestAnimationFrame(animateStep);
      } else {
        animationId = null;
        resolve();
      }
    }

    animationId = requestAnimationFrame(animateStep);
  });
}
