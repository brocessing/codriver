import map from 'controllers/map/map'
import ThreeComponent from 'abstractions/ThreeComponent/ThreeComponent'
import three from 'controllers/three/three'
import Chunk from 'components/three/Chunk/Chunk'

export default class Terrain extends ThreeComponent {
  setup () {
    this.chunkAdded = this.chunkAdded.bind(this)
    this.chunkRemoved = this.chunkRemoved.bind(this)
    map.on('chunk-added', this.chunkAdded)
    map.on('chunk-removed', this.chunkRemoved)
    this.chunks = {}
    map.init()
    // console.log('terrain')
  }

  removeChunk (id) {
    this.chunks[id].destroy()
    this.group.remove(this.chunks[id].group)
    this.chunks[id] = undefined
    delete this.chunks[id]
  }

  addChunk (id, data) {
    const newChunk = new Chunk(data)
    this.chunks[id] = newChunk
    this.group.add(newChunk.group)
    newChunk.group.position.x = data.x
    newChunk.group.position.z = data.y
    // console.log(data.x, data.y)
  }

  chunkAdded (data) {
    // console.log(data)
    // console.warn('CHUNK ADDED', data.id)
    if (this.chunks[data.id]) this.removeChunk(data.id)
    this.addChunk(data.id, data)
  }

  chunkRemoved (data) {
    // console.warn('CHUNK REMOVED', data.id)
    if (this.chunks[data.id]) this.removeChunk(data.id, data)
  }

  update (dt) {
    // Does it really matter ? chunks props are static
    for (let k in this.chunks) this.chunks[k].update(dt)
  }

  destroy () {
    super.destroy()
    map.off('chunk-added', this.chunkAdded)
    map.off('chunk-removed', this.chunkAdded)
  }
}
