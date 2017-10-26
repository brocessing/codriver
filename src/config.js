/* global THREE */

import store from 'utils/store'

export default {
  quickstart: 'fr',
  speechDebug: true,
  debug: true,
  fpsCounter: true,
  p2steps: 1 / 60,

  // autoload vendors libraries during the preloading phase
  vendors: [
    'vendors/dat.gui.min.js',
    'vendors/three.min.js',
    'vendors/howler.min.js',
    'vendors/p2.min.js',
    'vendors/p2.renderer.min.js'
  ],

  // autoload textures during the preloading phase
  textures: {
    'textures/gradients.png': function (tex) {
      store.set('tex.gradient', tex)
      tex.format = THREE.RGBFormat
      tex.needsUpdate = true
      store.set('mat.gradient', new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: tex
      }))
    }
  },

  // autoload json objects during the preloading phase
  objects: {
    'models/r5.json': function (geo, mats) {
      geo.scale(0.07, 0.07, 0.07)
      geo.translate(0, -0.32, 0)
      store.set('geo.r5', geo)
    }
  }
}
