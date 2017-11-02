import DomComponent from 'abstractions/DomComponent/DomComponent'

import map from 'controllers/map/map'
import store from 'utils/store'

const chunkId = (i, j) => `chunk_${i}_${j}`
const translate = ({x, y}) => `translateX(${x}px) translateY(${y}px)`

function createNSNode (n, v) {
  n = document.createElementNS('http://www.w3.org/2000/svg', n)
  for (var p in v) {
    if (p === 'class')
      (Array.isArray(v[p]) ? v[p]: [v[p]]).forEach(c => n.classList.add(c))
    else n.setAttributeNS(null, p, v[p])
  }
  return n
}

function createNode (n, v) {
  n = document.createElement(n)
  for (var p in v) {
    if (p === 'class')
      (Array.isArray(v[p]) ? v[p]: [v[p]]).forEach(c => n.classList.add(c))
    else n[p] = v[p]
  }
  return n
}

function removeNode (n) {
  n && n.parentNode && n.parentNode.removeChild(n)
}

function inBound (position, aabb) {
  return position[0] >= aabb.xmin && position[0] < aabb.xmax
    && position[1] >= aabb.ymin && position[1] < aabb.ymax
}

const defaultOpts = {
  width: 500,
  height: 500,
  viewDistance: 3,
  lockNorth: false,
}

export default class Minimap extends DomComponent {
  // called when a new instance of Minimap is made
  didInit (opts) {
    opts = Object.assign({}, defaultOpts, opts || {})

    this.onPlayerMove = this.onPlayerMove.bind(this)
    this.onPlayerRotate = this.onPlayerRotate.bind(this)

    this.width = opts.width
    this.height = opts.height

    this.viewDistance = opts.viewDistance + (opts.viewDistance & 1)
    this.viewRadius = this.viewDistance / 2

    this.pcenter = [0, 0]
    this.center = [0, 0]

    this.chunkSize = map.getChunkSize()
    this.chunkWidth = this.width / this.viewDistance
    this.chunkHeight = this.height / this.viewDistance

    this.playerPos = [0, 0]

    this.playerAng = 0
    this.lockNorth = opts.lockNorth
  }

  // the returned DOM is available from this.refs.base
  render () {
    const el = createNode('section', { class: 'gui-minimap' })
    el.style.width = this.width + 'px'
    el.style.height = this.height + 'px'

    this.refs.car = createNode('div', {
      id: 'car',
      class: 'gui-minimap-car'
    })

    this.refs.container = createNode('div', {
      class: 'gui-minimap-container'
    })

    el.appendChild(this.refs.car)
    el.appendChild(this.refs.container)

    for (let i = -this.viewRadius; i <= this.viewRadius; i++) {
      for (let j = -this.viewRadius; j <= this.viewRadius; j++) {
        this.addChunk(this.center[0] + i, this.center[1] + j);
      }
    }

    // DEBUG
    this.onCopAdded({id: 0, position: [11, 0]})

    return el
  }

  update () {
    this.center = [
      Math.floor((this.playerPos[0] + this.chunkSize / 2) / this.chunkSize),
      Math.floor((this.playerPos[1] + this.chunkSize / 2) / this.chunkSize)
    ]

    let di = this.center[0] - this.pcenter[0]
    if (di) {
      let ti = di * this.viewRadius
      for (let j = -this.viewRadius; j <= this.viewRadius; j++) {
        this.addChunk(-(this.center[0] + ti), this.center[1] + j)
        this.removeChunk(-(this.center[0] - ti - di), this.center[1] + j)
      }
    }
    let dj = this.center[1] - this.pcenter[1]
    if (dj) {
      let tj = dj * this.viewRadius
      for (let i = -this.viewRadius; i <= this.viewRadius; i++) {
        this.addChunk(this.center[0] + i, -(this.center[1] + tj) )
        this.removeChunk(this.center[0] + i, -(this.center[1] - tj - dj))
      }
    }

    this.pcenter = [...this.center]
  }


  addChunk (i, j) {
    if (!this.refs.chunks) this.refs.chunks = []

    let id = chunkId(i, j)
    if (!this.refs.chunks[id]) {
      let chunk = map.getChunkFromPos(i, j)
      if (chunk) {
        let chunkEl = createNSNode('svg', {
          class: 'gui-minimap-chunk',
          width: this.chunkWidth,
          height: this.chunkHeight,
          viewBox: `-0.01 -0.01 ${this.chunkSize + 0.01} ${this.chunkSize + 0.01}`
        })

        chunkEl.style.left = Math.floor((i * this.chunkWidth) - (this.chunkWidth / 2)) + 'px'
        chunkEl.style.top = Math.floor((j * this.chunkHeight) - (this.chunkHeight / 2)) + 'px'
        chunkEl.innerHTML = chunk.svg
        this.refs.container.appendChild(chunkEl)

        this.refs.chunks[id] = chunkEl
      }
    }
  }

  removeChunk (i, j) {
    let id = chunkId(i, j)
    removeNode(this.refs.chunks[id])
    this.refs.chunks[id] = null
    delete this.refs.chunks[id]
  }

  onPlayerMove (newPos) {
    this.playerPos = newPos
    this.refs.container.style.transform = translate({
      x: (this.playerPos[0] / this.chunkSize) * this.chunkWidth,
      y: (this.playerPos[1] / this.chunkSize) * this.chunkHeight
    })

    this.update()
  }

  onPlayerRotate (newAng) {
    this.playerAng = newAng
    if (this.lockNorth) this.refs.base.style.transform = `rotate(${this.playerAng}rad)`
    this.refs.car.style.transform = `rotate(${-this.playerAng}rad)`
  }

  onCopAdded ({ id, position }) {
    if (!this.refs.cops) this.refs.cops = []

    let cop = createNode('div', { class: 'gui-minimap-cop' })
    cop.style.transform = translate({
      x: (position[0] / this.chunkSize) * this.chunkWidth,
      y: (position[1] / this.chunkSize) * this.chunkHeight
    })

    this.refs.container.appendChild(cop)
    this.refs.cops[id] = cop
  }

  onCopMove ({ id, position }) {
    if (this.refs.cops[id]) {
      this.refs.cops[id].style.transform = translate({
        x: (position[0] / this.chunkSize) * this.chunkWidth,
        y: (position[1] / this.chunkSize) * this.chunkHeight
      })
    }
  }

  onCopRemoved ({ id }) {
    removeNode(this.refs.cops[id])
    this.refs.cops[id] = null
  }

  didMount (el) {
    store.watch('player.position', this.onPlayerMove)
    store.watch('player.angle', this.onPlayerRotate)
  }

  willUnmount () {
    store.unwatch('player.position', this.onPlayerMove)
    store.unwatch('player.angle', this.onPlayerRotate)
  }
}