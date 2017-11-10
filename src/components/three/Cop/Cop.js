/* global THREE, p2 */

import map from 'controllers/map/map'
import store from 'utils/store'
import three from 'controllers/three/three'
import ThreeComponent from 'abstractions/ThreeComponent/ThreeComponent'
import Vehicle from 'abstractions/Vehicle/Vehicle'
import config from 'config'
import orders from 'controllers/orders/orders'
import events from 'utils/events'
import noop from 'utils/noop'
import EasyStarJS from 'easystarjs'
import cam from 'controllers/camera/camera'
import particles from 'controllers/particles/particles'
import sfx from 'controllers/sfx/sfx'
import basic from 'shaders/basic/basic'
const EasyStar = EasyStarJS.js
/*
  this.group = position sync with the p2 body position
  this.chassis = angle sync with the p2 angle
*/

export default class Cop extends Vehicle {
  setup (opts) {
    this.onDeath = opts.onDeath || noop
    this.onRemoved = opts.onRemoved || noop
    // Vehicle: three
    this.chassis = new THREE.Mesh(store.get('geo.cop'), basic.getMaterial())
    this.group.add(this.chassis)

    this.meshes.shadow = new THREE.Mesh(store.get('geo.plane'), store.get('mat.shadow'))
    const shadow = this.meshes.shadow
    shadow.scale.set(0.135, 0.280, 1)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.set(0, 0.001, 0)
    this.group.add(this.meshes.shadow)
    if (config.lofi) this.meshes.shadow.visible = false

    // Vehicle: p2 main physic attributes
    this.body = new p2.Body({
      mass: 1.5,
      position: [-opts.x || 0, opts.y || 0],
      angle: opts.angle
    })
    this.body.propType = 'cop'
    const self = this
    this.body.impactCallback = function (opts) {
      if (opts.impactType === 'player') {
        self.explode()
      }
    }

    const box = new p2.Box({ width: 0.13, height: 0.28 })
    box.material = new p2.Material()
    this.body.addShape(box)
    store.set('car.p2material', box.material)

    // Vehicle: p2.Vehicle specific properties
    this.vehicle = new p2.TopDownVehicle(this.body)
    this.frontWheel = this.vehicle.addWheel({ localPosition: [0, 0.2] })
    this.backWheel = this.vehicle.addWheel({ localPosition: [0, -0.2] })

    // Vehicle driving behaviours
    this.improvise = false
    this.improvisationTreshold = 3
    this.running = true

    this.improvisationMode = 1

    // Misc options
    this.debugSteering = false
    this.debugWaypoints = false
    this.manualControls = false
    this.id = opts.id

    this.maxSpeed = 1.2
    this.backWheelFriction = 3.3
    this.maxSteer = Math.PI / 4

    this.searching = false
    // three.debugBody(this.body)
    this.astar = new EasyStar()
    this.astar.setAcceptableTiles([1])
    this.astarInstance = undefined
    this.astar.setIterationsPerCalculation(10)
    this.pos = this.group.position

    this.findTimer = 0
    this.findTimerStart = 3000
    this.dist = 0
  }

  searchPlayer () {
    if (this.astarInstance !== undefined) this.astar.cancelPath(this.astarInstance)
    this.astar.setGrid(map.copyWalkMap())
    const ppos = store.get('player.position')
    const fromPos = map.getWalkCoordFromThreePos(this.pos.x, this.pos.z)
    const toPos = map.getWalkCoordFromThreePos(ppos[0], ppos[1])

    let middleChunk = map.getCurrentMiddleChunk()
    const middleX = middleChunk.chunkX
    const middleY = middleChunk.chunkY
    middleChunk = undefined
    try {
      this.astarInstance = this.astar.findPath(fromPos[0], fromPos[1], toPos[0], toPos[1], (path) => {
        if (!path) {
          this.waypoints.cancelAll()
          this.astarInstance = undefined
          this.findTimer = this.findTimerStart
          this.waypoints.improvise = true
          return
        }
        this.waypoints.improvise = false
        map.convertWalkPathToThreePos(path, { middleX, middleY })
        this.waypoints.createFromPath(path)
        // restart timer before making a new a star
        // this.astar.cancelPath(this.astarInstance)
        this.astarInstance = undefined
        this.findTimer = this.findTimerStart
      })
    } catch (err) {
      this.waypoints.cancelAll()
      this.waypoints.improvise = true
      this.astarInstance = undefined
      this.findTimer = this.findTimerStart
    }
  }

  didDie () {
    const maxdist = 8
    const f = 1 - ((Math.min(maxdist + 1, Math.max(1, this.dist)) - 1) / maxdist)
    // blast depending on the distance from the player
    this.smokeDensity = 7
    particles.emit({
      x: this.group.position.x,
      y: 0.1,
      z: this.group.position.z,
      type: 2,
      amount: 30
    })
    particles.emit({
      x: this.group.position.x,
      y: 0.1,
      z: this.group.position.z,
      type: 3,
      amount: 25
    })
    cam.addCameraShake(0.9 * f)
    this.onDeath(this)
    this.astar.cancelPath(this.astarInstance)
  }

  update (dt) {
    super.update(dt)
    const playerDead = store.get('player.dead')

    const ppos = store.get('player.position')
    this.dist = Math.pow(ppos[0] - this.group.position.x, 2) + Math.pow(ppos[1] - this.group.position.z, 2)

    this.meshes.shadow.rotation.z = this.chassis.rotation.y

    sfx.updateCop(this.id, this.group.position, this.dead)

    if (!this.dead) {
      events.emit('cop.move', { id: this.id, position: [this.group.position.x, this.group.position.z] })

      if (this.findTimer < 1 && !this.target && !playerDead) {
        if (this.astarInstance === undefined) this.searchPlayer()
      } else {
        this.findTimer -= dt
      }

      if (this.astarInstance && !this.target && !playerDead) this.astar.calculate()

      if (playerDead && !this.winner) {
        this.winner = true
        this.waypoints.cancelAll()
        this.waypoints.preLastReachPos = null
        this.waypoints.lastReachPos = null
        this.waypoints.improvise = true
        this.target = undefined
      } if (this.waypoints.list.length < 3 && this.waypoints.improvise === false && this.dist < 5) {
        this.waypoints.cancelAll()
        this.waypoints.preLastReachPos = null
        this.waypoints.lastReachPos = null
        this.target = [ppos[0], ppos[1]]
        if (this.astarInstance !== undefined) this.astar.cancelPath(this.astarInstance)
      } else {
        this.target = undefined
      }
    }

    if (this.dist > 800) this.onRemoved(this)
  }

  destroy () {
    if (this.astarInstance !== undefined) this.astar.cancelPath(this.astarInstance)
    this.astar = undefined
    this.pos = undefined
    super.destroy()
  }
}
