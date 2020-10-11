// @ts-ignore-file
export default class ShaderProgram {

    // @ts-ignore
    constructor( options = {} ) {

        options = Object.assign( {
            antialias: false,
            side: 'front',
            vertex: `
        precision highp float;

        attribute vec4 a_position;
        attribute vec4 a_color;

        uniform float u_time;
        uniform vec2 u_resolution;
        uniform mat4 u_projection;

        varying vec4 v_color;

        void main() {

          gl_Position = u_projection * a_position;
          gl_PointSize = (10.0 / gl_Position.w) * 100.0;

          v_color = a_color;

        }`,
            fragment: `
        precision highp float;

        uniform sampler2D u_texture;
        uniform int u_hasTexture;

        varying vec4 v_color;

        void main() {

          if ( u_hasTexture == 1 ) {

            gl_FragColor = v_color * texture2D(u_texture, gl_PointCoord);

          } else {

            gl_FragColor = v_color;

          }

        }`,
            uniforms: {},
            buffers: {},
            camera: {},
            texture: null,
            onUpdate: ( () => {} ),
            onResize: ( () => {} ),
        }, options )

        const uniforms = Object.assign( {
            time: { type: 'float', value: 0 },
            hasTexture: { type: 'int', value: 0 },
            resolution: { type: 'vec2', value: [ 0, 0 ] },
            projection: { type: 'mat4', value: [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ] },
            // @ts-ignore
        }, options.uniforms )

        const buffers = Object.assign( {
            position: { size: 3, data: [] },
            color: { size: 4, data: [] },
            // @ts-ignore
        }, options.buffers )

        const camera = Object.assign( {
            fov: 60,
            near: 1,
            far: 10000,
            aspect: 1,
            z: 100,
            perspective: true,
            // @ts-ignore
        }, options.camera )

        // @ts-ignore
        const renderer = PIXI.autoDetectRenderer(800, 600);
        const canvas = renderer.view;
        const gl = renderer.context.renderer.gl;
        // @ts-ignore
        // const gl = canvas.getContext( 'webgl', { antialias: options.antialias } )

        // @ts-ignore
        if ( ! gl ) return false

        // @ts-ignore
        this.count = 0
        // @ts-ignore
        this.gl = gl
        // @ts-ignore
        this.canvas = canvas
        // @ts-ignore
        this.camera = camera
        // @ts-ignore
        this.onUpdate = options.onUpdate
        // @ts-ignore
        this.onResize = options.onResize
        // @ts-ignore
        this.data = {}

        // @ts-ignore
        this.createProgram( options.vertex, options.fragment )

        this.createBuffers( buffers )
        this.createUniforms( uniforms )

        this.updateBuffers()
        this.updateUniforms()

        // @ts-ignore
        this.createTexture( options.texture )

        // @ts-ignore
        gl.enable( gl.BLEND )
        // @ts-ignore
        gl.enable( gl.CULL_FACE )
        // @ts-ignore
        gl.blendFunc( gl.SRC_ALPHA, gl.ONE )

        // @ts-ignore
        this.resize()

        this.update = this.update.bind( this )
        // @ts-ignore
        this.time = { start: performance.now(), old: performance.now() }
        this.update()

    }

    // @ts-ignore
    resize( e ) {
        const width = 1800
        const height = 800

        // @ts-ignore
        const canvas = this.canvas
        // @ts-ignore
        const gl = this.gl

        // @ts-ignore
        const aspect = this.aspect = 1
        const dpi = devicePixelRatio

        gl.viewport( 0, 0, width * dpi, height * dpi )
        gl.clearColor( 0, 0, 0, 0 )

        // @ts-ignore
        this.uniforms.resolution = [ width, height ]
        // @ts-ignore
        this.uniforms.projection = this.setProjection( aspect )

        // @ts-ignore
        this.onResize( width, height, dpi )

    }

    // @ts-ignore
    setProjection( aspect ) {

        // @ts-ignore
        const camera = this.camera

        if ( camera.perspective ) {

            camera.aspect = aspect

            const fovRad = camera.fov * ( Math.PI / 180 )
            const f = Math.tan( Math.PI * 0.5 - 0.5 * fovRad )
            const rangeInv = 1.0 / ( camera.near - camera.far )

            const matrix = [
                f / camera.aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (camera.near + camera.far) * rangeInv, -1,
                0, 0, camera.near * camera.far * rangeInv * 2, 0
            ]

            matrix[ 14 ] += camera.z
            matrix[ 15 ] += camera.z

            return matrix

        } else {

            return [
                // @ts-ignore
                2 / this.width, 0, 0, 0,
                // @ts-ignore
                0, -2 / this.height, 0, 0,
                0, 0, 1, 0,
                -1, 1, 0, 1,
            ]

        }

    }

    // @ts-ignore
    createShader( type, source ) {

        // @ts-ignore
        const gl = this.gl
        const shader = gl.createShader( type )

        gl.shaderSource( shader, source )
        gl.compileShader( shader )

        if ( gl.getShaderParameter (shader, gl.COMPILE_STATUS ) ) {

            return shader

        } else {

            console.log( gl.getShaderInfoLog( shader ) )
            gl.deleteShader( shader )

        }

    }

    // @ts-ignore
    createProgram( vertex, fragment ) {

        // @ts-ignore
        const gl = this.gl

        const vertexShader = this.createShader( gl.VERTEX_SHADER, vertex )
        const fragmentShader = this.createShader( gl.FRAGMENT_SHADER, fragment )

        const program = gl.createProgram()

        gl.attachShader( program, vertexShader )
        gl.attachShader( program, fragmentShader )
        gl.linkProgram( program )

        if ( gl.getProgramParameter( program, gl.LINK_STATUS ) ) {

            gl.useProgram( program )
            // @ts-ignore
            this.program = program

        } else {

            console.log( gl.getProgramInfoLog( program ) )
            gl.deleteProgram( program )

        }

    }

    // @ts-ignore
    createUniforms( data ) {

        // @ts-ignore
        const gl = this.gl
        // @ts-ignore
        const uniforms = this.data.uniforms = data
        // @ts-ignore
        const values = this.uniforms = {}

        Object.keys( uniforms ).forEach( name => {

            const uniform = uniforms[ name ]

            // @ts-ignore
            uniform.location = gl.getUniformLocation( this.program, 'u_' + name )

            Object.defineProperty( values, name, {
                set: value => {

                    uniforms[ name ].value = value
                    this.setUniform( name, value )

                },
                get: () => uniforms[ name ].value
            } )

        } )

    }

    // @ts-ignore
    setUniform( name, value ) {

        // @ts-ignore
        const gl = this.gl
        // @ts-ignore
        const uniform = this.data.uniforms[ name ]

        uniform.value = value

        switch ( uniform.type ) {
            case 'int': {
                gl.uniform1i( uniform.location, value )
                break
            }
            case 'float': {
                gl.uniform1f( uniform.location, value )
                break
            }
            case 'vec2': {
                gl.uniform2f( uniform.location, ...value )
                break
            }
            case 'vec3': {
                gl.uniform3f( uniform.location, ...value )
                break
            }
            case 'vec4': {
                gl.uniform4f( uniform.location, ...value )
                break
            }
            case 'mat2': {
                gl.uniformMatrix2fv( uniform.location, false, value )
                break
            }
            case 'mat3': {
                gl.uniformMatrix3fv( uniform.location, false, value )
                break
            }
            case 'mat4': {
                gl.uniformMatrix4fv( uniform.location, false, value )
                break
            }
        }

        // ivec2       : uniform2i,
        // ivec3       : uniform3i,
        // ivec4       : uniform4i,
        // sampler2D   : uniform1i,
        // samplerCube : uniform1i,
        // bool        : uniform1i,
        // bvec2       : uniform2i,
        // bvec3       : uniform3i,
        // bvec4       : uniform4i,

    }

    updateUniforms() {

        // @ts-ignore
        const gl = this.gl
        // @ts-ignore
        const uniforms = this.data.uniforms

        Object.keys( uniforms ).forEach( name => {

            const uniform = uniforms[ name ]

            // @ts-ignore
            this.uniforms[ name ] = uniform.value

        } )

    }

    // @ts-ignore
    createBuffers( data ) {

        // @ts-ignore
        const gl = this.gl
        // @ts-ignore
        const buffers = this.data.buffers = data
        // @ts-ignore
        const values = this.buffers = {}

        Object.keys( buffers ).forEach( name => {

            const buffer = buffers[ name ]

            buffer.buffer = this.createBuffer( 'a_' + name, buffer.size )

            Object.defineProperty( values, name, {
                set: data => {

                    buffers[ name ].data = data
                    this.setBuffer( name, data )

                    if ( name == 'position' )
                      // @ts-ignore
                        this.count = buffers.position.data.length / 3

                },
                get: () => buffers[ name ].data
            } )

        } )

    }

    // @ts-ignore
    createBuffer( name, size ) {

        // @ts-ignore
        const gl = this.gl
        // @ts-ignore
        const program = this.program

        const index = gl.getAttribLocation( program, name )
        const buffer = gl.createBuffer()

        gl.bindBuffer( gl.ARRAY_BUFFER, buffer )
        gl.enableVertexAttribArray( index )
        gl.vertexAttribPointer( index, size, gl.FLOAT, false, 0, 0 )

        return buffer

    }

    // @ts-ignore
    setBuffer( name, data ) {

        // @ts-ignore
        const gl = this.gl
        // @ts-ignore
        const buffers = this.data.buffers

        if ( name == null && ! gl.bindBuffer( gl.ARRAY_BUFFER, null ) ) return

        gl.bindBuffer( gl.ARRAY_BUFFER, buffers[ name ].buffer )
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( data ), gl.STATIC_DRAW )

    }

    updateBuffers() {

        // @ts-ignore
        const gl = this.gl
        // @ts-ignore
        const buffers = this.buffers

        Object.keys( buffers ).forEach( name =>
          // @ts-ignore
            buffers[ name ] = buffer.data
        )

        // @ts-ignore
        this.setBuffer( null )

    }

    // @ts-ignore
    createTexture( src ) {

        // @ts-ignore
        const gl = this.gl
        const texture = gl.createTexture()

        gl.bindTexture( gl.TEXTURE_2D, texture )
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array( [ 0, 0, 0, 0 ] ) )

        // @ts-ignore
        this.texture = texture

        if ( src ) {

            // @ts-ignore
            this.uniforms.hasTexture = 1
            this.loadTexture( src )

        }

    }

    // @ts-ignore
    loadTexture( src ) {

        // @ts-ignore
        const gl = this.gl
        // @ts-ignore
        const texture = this.texture

        const textureImage = new Image()

        textureImage.onload = () => {

            gl.bindTexture( gl.TEXTURE_2D, texture )

            gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImage )

            gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR )
            gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR )

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        }

        textureImage.src = src

    }

    update() {
        // @ts-ignore
        const gl = this.gl

        const now = performance.now()
        // @ts-ignore
        const elapsed = ( now - this.time.start ) / 5000
        // @ts-ignore
        const delta = now - this.time.old
        // @ts-ignore
        this.time.old = now

        // @ts-ignore
        this.uniforms.time = elapsed

        // @ts-ignore
        if ( this.count > 0 ) {
            gl.clear( gl.COLORBUFFERBIT )
            // @ts-ignore
            gl.drawArrays( gl.POINTS, 0, this.count )
        }

        // @ts-ignore
        this.onUpdate( delta )

        requestAnimationFrame( this.update )

    }

}
