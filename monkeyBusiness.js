// Emily Port with some help from the Great Dr. Wiegand
// The obj file came from a Brackeys video I watched a long time ago

//***************************************************
// Read in obj file
async function FetchWrapper(objURL) {
    const fetchResponse = await fetch(objURL);//, {mode:'no-cors'});
    const objFileContents = await fetchResponse.text();
    return objFileContents;
}

// Borrowed from Dr.Weigand's code

// The global gl and shader hooks to cheat for rendering
var ggl = null;
var gShaderProgram = null;
var gCanvas = null;
// for rotation
var thetaLoc;
var direction = 1.0;
var rotation = (180 * Math.PI) / 180;



// I kept all of the the parsing fucntions in the main file becuase thats what I did on project 2
// If I see a reason to later I may move them but for now I won't mess with a good thing
function SimpleObjParse(objFileContents) {
    const objFileLines = objFileContents.split('\n');

    var vertexList = new Array();
    var faceList = new Array();
    var textureList = new Array();
    var normalList = new Array();

    const vertexRE = /^[Vv] .*/; //I don't know what the 'RE' stands for here but I'm assuming this is what it uses to determine what data is stored in each line
    const faceRE = /^f .*/;
    const textureRE = /^vt .*/;
    const normalRE = /^vn .*/;

    for (let lineIDX=0; lineIDX < objFileLines.length; ++lineIDX) {
        const line = objFileLines[lineIDX].trim();

        const vertexMatch = vertexRE.exec(line);
        const faceMatch = faceRE.exec(line);
        const textureMatch = textureRE.exec(line);
        const normalMatch = normalRE.exec(line);

        // vertex Line
        if (vertexMatch != null) {
            const fields = line.split(/\s/);
            vertexList.push(    vec4(parseFloat(fields[1]),
                                    parseFloat(fields[2]),
                                    parseFloat(fields[3]),
                                    1.0));
        }

        // face line
        else if (faceMatch != null) {
            const fields = line.split(/\s/);

            var vidxList = new Array();
            for (let faceIDX = 1; faceIDX < fields.length; ++faceIDX) {
                var faceVertexIndexStrings = fields[faceIDX].split('/');
                vidxList.push (parseInt(faceVertexIndexStrings[0]));
            }

            for (let vidx = 1; vidx < vidxList.length-1; ++vidx) {
                faceList.push( [vidxList[0]-1, vidxList[vidx]-1, vidxList[vidx + 1]-1 ]);
            }
        }

        // texture line
        else if (textureMatch != null) {
            const fields = line.split(/\s/);
            textureList.push(   new Array(parseFloat(fields[1]),
                                        parseFloat(fields[2])));
        }

        // normal line
        else if (normalMatch != null) {
            const fields = line.split(/\s/);
            normalList.push(    vec3(parseFloat(fields[1]),
                                    parseFloat(fields[2]),
                                    parseFloat(fields[3]) ));
        }

    }
    
    return ({"vertices": vertexList,
            "faces": faceList,
            "textures": textureList,
            "normals": normalList});
}

// This function should give the triangles that are meant to be drawn
function VerySimpleTriangleVertexExtraction(objDictionary) {
    const vertexList = objDictionary.vertices;
    const faceList = objDictionary.faces;
    var points = new Array();

    // I keep getting an annoying error telling me to do my loops as a for of loop instead so I will try it out here anad see if it works
    for (let face of faceList) {
        const triangleList = face;

        points.push(vertexList[triangleList[0]]);
        points.push(vertexList[triangleList[1]]);
        points.push(vertexList[triangleList[2]]);
    }

    return (points);
}

// creates a list of normals, A little confused because I thought we already got that from the obj file but oh well
function EstimateNormalsFromTriangles(points) {
    var normals = new Array();

    for (let triIdx = 0; triIdx < points.length; triIdx+=3) {
        const p0 = vec3(points[triIdx + 0][0],
                        points[triIdx + 0][1],
                        points[triIdx + 0][2]);
        const p1 = vec3(points[triIdx + 1][0],
                        points[triIdx + 1][1],
                        points[triIdx + 1][2]);
        const p2 = vec3(points[triIdx + 2][0],
                        points[triIdx + 2][1],
                        points[triIdx + 2][2]);

        // The normal for the triangle is 
        // (p2-p0) cross (p1-p0) !!! this seems important
        const u1 = subtract(p2,p0);
        const u2 = subtract(p1,p0);
        var n = cross(u1,u2);

        n = normalize(n);

        normals.push(n);
        normals.push(n);
        normals.push(n);
    }

    return (normals);
}

// end of reading in obj file functions
// *********************************************


/*********************I think perspective changes need to happen here******************************/
// I changed variable names to help me no what is going on


function GetPerspectiveProjectionMatrix(fovy, near, far) {
    var canvas = document.getElementById("gl-canvas");
    var aspectRatio = canvas.width / canvas.height;
    var fovyRadian = fovy * Math.PI / 180.0;
    var nr = near;
    var fr = far;
    var tp = nr * Math.tan(fovyRadian);
    var rgt = tp * aspectRatio;

    var P = (mat4(nr / rgt, 0, 0, 0,
        0, nr / tp, 0, 0,
        0, 0, -(fr + nr) / (fr - nr), (-2 * fr * nr) / (fr - nr),
        0, 0, -1, 0));
    return (P);
}

function handleCameraPosition() {
    var rotateZ = parseFloat(document.getElementById("rotatez").value);
    var rotateY = parseFloat(document.getElementById("rotatey").value);

    var eye = vec4(0.1, 0.2, -2.0, 1.0);

    var cs = Math.cos(rotateY * Math.PI / 180.0);
    var sn = Math.sin(rotateY * Math.PI / 180.0);

    var Ry = mat4(cs, 0.0, -sn, 0.0,
        0.0, 1.0, 0.0, 0.0,
        sn, 0.0, cs, 0.0,
        0.0, 0.0, 0.0, 1.0);

    var csZ = Math.cos(rotateZ * Math.PI / 180.0);
    var snZ = Math.sin(rotateZ * Math.PI / 180.0);

    var Rz = mat4(csZ, -snZ, 0.0, 0.0,
        snZ, csZ, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0);


    eye = mult(Rz, mult(Ry, eye));

    var cameraMatrix = lookAt(vec3(eye[0], eye[1], eye[2]),  // Location of camera 
        vec3(0, 0, 0),  // Where camera is looking
        vec3(0, 1, 0)); // Which way is "up"
    

 

    var cameraPosition = vec3(cameraMatrix[0][0], cameraMatrix[0][1], cameraMatrix[0][2]);

    var worldCameraPositionLocation = ggl.getUniformLocation(gShaderProgram, "u_worldCameraPosition");
    ggl.uniform3fv(worldCameraPositionLocation, cameraPosition);

    ggl.uniformMatrix4fv(ggl.getUniformLocation(gShaderProgram, "uCameraMatrix"), false, flatten(cameraMatrix));

    //render();
}



// Set up the shaders, this will almost definitely need to be changed later
function setupShaders(gl) {
    var vertexShaderCode = "attribute vec4 vPosition;" +
        "uniform mat4 uTheta;" +
        "uniform float uMotion;" +
        "varying vec3 v_worldPosition;" +
        "varying vec3 v_worldNormal;" +
        "attribute vec3 vNormal;" +
        "attribute vec2 vTexCoord;" +
        "varying vec4 fColor;" +
        "varying vec2 fTexCoord;" +
        "uniform vec4 uAmbientProduct;" + //light/shading properties
        "uniform vec4 uDiffuseProduct;" +
        "uniform vec4 uSpecularProduct;" +
        "uniform vec4 uLightPosition;" +
        "uniform float uShininess;" +
        "uniform mat4 uModelMatrix;" + //matrices
        "uniform mat4 uCameraMatrix;" +
        "uniform mat4 uProjectionMatrix;" +
        "void main() {" +
        "   vec3 vertexPos = (uModelMatrix * vPosition).xyz;" +
        "   vec3 L;" + //light stuff
        "   if (uLightPosition.w==0.0) L= normalize(uLightPosition.xyz);" +
        "   else L = normalize(uLightPosition.xyz - vertexPos);" +
        "" +
        "   vec3 E = -normalize(vertexPos);" +
        "   vec3 H = normalize(L+E);" +
        "   vec3 N = normalize( (uModelMatrix * vec4(vNormal,0.0)).xyz );" +
        "   vec4 ambient = uAmbientProduct;" +
        "   vec4 diffuse = max( dot(L,N), 0.0) * uDiffuseProduct;" +
        "   vec4 specular = pow( max( dot(N,H), 0.0), uShininess) * uSpecularProduct;" +
        "   if ( dot(L,N) < 0.0) specular = vec4(0.0, 0.0, 0.0, 1.0);" +
        "" +
        "   fColor = ambient + diffuse + specular;" + //get color
        "   fColor.a = 1.0;" +
        "   fTexCoord = vTexCoord;" +
        "   if (uMotion==1.0){" +
        "       gl_Position = uProjectionMatrix * uCameraMatrix * uModelMatrix * uTheta * vPosition;" + // set position with perspectives
        "       gl_Position.x = gl_Position.x / gl_Position.w;" +
        "       gl_Position.y = gl_Position.y / gl_Position.w;" +
        "       gl_Position.z = gl_Position.z / gl_Position.w;" +
        "       gl_Position.w = 1.0;" +
        "   } else {" +
        "       gl_Position = uProjectionMatrix * uCameraMatrix * uModelMatrix * vPosition; " + // set position with perspectives
        "       gl_Position.x = gl_Position.x / gl_Position.w;" +
        "       gl_Position.y = gl_Position.y / gl_Position.w;" +
        "       gl_Position.z = gl_Position.z / gl_Position.w;" +
        "       gl_Position.w = 1.0;" +
        "   }" +
        "   v_worldPosition = vec3(gl_Position.x, gl_Position.y, gl_Position.z);" +
        "   v_worldNormal = vNormal;" +
        "}";
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderCode);
    gl.compileShader(vertexShader);
    var compileSuccess = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
    if (!compileSuccess){
        console.log("Vertex shader failed to compile");
        let compilationLog = gl.getShaderInfoLog(vertexShader);
        console.log("Shader compiler log: " + compilationLog);
    }

    var fragmentShaderCode = "precision mediump float;" +
    "varying vec4 fColor;" +
    "varying vec3 v_worldPosition;" +
    "varying vec3 v_worldNormal;"+
    "uniform samplerCube u_texture;" +
    "uniform float uMirror;" +
    "uniform vec3 u_worldCameraPosition;" +
        "void main() {" +
        "   if(uMirror==1.0){" +
        "       vec3 worldNormal = normalize(v_worldNormal);"+
        "       vec3 eyeToSurfaceDir = normalize(v_worldPosition - u_worldCameraPosition);" +
        "       vec3 direction = reflect(eyeToSurfaceDir, worldNormal);"+
        "       gl_FragColor = textureCube(u_texture, direction);" +
        "   } else {"+
        "    gl_FragColor = fColor;" +
        "}" +
        "}";
        // "varying vec4 fColor;" +
        // "varying  vec2 fTexCoord;" +
        // "uniform sampler2D texture;" +
        // "void main() {" +
        // // "    if (fTexCoord.x < 0.0)" +  
        // "      gl_FragColor = fColor;" +
        // // "    else" +
        // // "      gl_FragColor = fColor*texture2D( texture, fTexCoord );" + 
        // "}"
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderCode);
    gl.compileShader(fragmentShader);
    compileSuccess = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
    if (!compileSuccess) {
        console.log('Fragment shader failed to compile!');
        let compilationLog = gl.getShaderInfoLog(fragmentShader);
        console.log('Shader compiler log: ' + compilationLog);
    }

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        let info = gl.getProgramInfoLog(shaderProgram);
        console.log("Could not compile WebGL program: " + info);
    }

    thetaLoc = gl.getUniformLocation(shaderProgram, "uTheta"); //nedd to change for matrix

    return shaderProgram;
}


// Another functions that will be refactored later but for now I am just concerned with if my obj file will be rendered
function render(FriendList, theta) {
    ggl.clear(ggl.COLOR_BUFFER_BIT | ggl.DEPTH_BUFFER_BIT);

    theta += rotation * 0.01;

    var cs = Math.cos(theta);
    var sn = Math.sin(theta);
    
    var thetaMatrix = mat4(cs, 0.0, -sn, 0.0,
        0.0, 1.0, 0.0, 0.0,
        sn, 0.0, cs, 0.0,
        0.0, 0.0, 0.0, 1.0);

    ggl.uniformMatrix4fv(thetaLoc, false, flatten(thetaMatrix)); // need to change this to a matrix

    for (let FriendIdx = 0; FriendIdx < FriendList.length; FriendIdx++) {
        FriendList[FriendIdx].ResetMatrix();
        FriendList[0].Translate(0.0, 0.0, 0.0);
        FriendList[1].Translate(-2.4, -0.2, 0.0);
        FriendList[1].Scale(0.6, 0.6, 0.6);
        FriendList[2].Scale(0.02, 0.02, 0.02);
        FriendList[2].RotateY(180);
        FriendList[2].Translate(1.5, -1.0, 0.0);
        FriendList[FriendIdx].DrawFriend();
    }

    window.requestAnimationFrame(function () { render(FriendList, theta) });
}

function SetEnvironmentMapping(gl, shaderProgram) {
    // Create a texture.
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            url: 'https://raw.githubusercontent.com/WinthropUniversity/csci440-fa21-project3-emjapo/EnviroMapping/px.png?token=AM6SBYSYQTF4IM5QRL3DPIDBWGSAI',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            url: 'https://raw.githubusercontent.com/WinthropUniversity/csci440-fa21-project3-emjapo/EnviroMapping/nx.png?token=AM6SBYXOGKRLL3DJ5ZGX7YDBWGRDS',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            url: 'https://raw.githubusercontent.com/WinthropUniversity/csci440-fa21-project3-emjapo/EnviroMapping/py.png?token=AM6SBYRGSFU3ZH7CBY5IJR3BWGSCQ',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            url: 'https://raw.githubusercontent.com/WinthropUniversity/csci440-fa21-project3-emjapo/EnviroMapping/ny.png?token=AM6SBYSU7WWAPCCFXYQMQGDBWGR2Q',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            url: 'https://raw.githubusercontent.com/WinthropUniversity/csci440-fa21-project3-emjapo/EnviroMapping/pz.png?token=AM6SBYXWWFHGSZ6UVJNAJADBWGSFQ',
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            url: 'https://raw.githubusercontent.com/WinthropUniversity/csci440-fa21-project3-emjapo/EnviroMapping/nz.png?token=AM6SBYTM47K3CQ2JHZNR4TDBWGR5Q', // need to change this once I push
        },
    ];
    faceInfos.forEach((faceInfo) => {
        const { target, url } = faceInfo;

        // Upload the canvas to the cubemap face.
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 512;
        const height = 512;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;

        // setup each face so it's immediately renderable
        gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

        // Asynchronously load an image
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = url;
        image.addEventListener('load', function () {
            // Now that the image has loaded upload it to the texture.
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texImage2D(target, level, internalFormat, format, type, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        });
    });
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    var textureLocation = gl.getUniformLocation(shaderProgram, "u_texture");

    gl.uniform1i(textureLocation, 0);
}

// main function that invokes all of the other functions
async function main() {
    var canvas = document.getElementById("gl-canvas");
    var gl = WebGLUtils.setupWebGL(canvas);
    if(!gl) {
        alert("WebGL is not available");
    }
    

    gl.viewport(0, 0, canvas.clientWidth, canvas.height);
    //gl.clearColor(1.0, 1.0, 1.0, 1.0); // this probably isn't the best practice to get rid of this but it was the only way to get the picture
    gl.enable(gl.DEPTH_TEST);

    

    var shaderProgram = setupShaders(gl);

    ggl = gl;
    gShaderProgram = shaderProgram;
    gCanvas = canvas;

    SetEnvironmentMapping(gl, shaderProgram);


    var zposition = parseFloat(document.getElementById("rotatez").value);
    var thetacam = parseFloat(document.getElementById("rotatey").value); // wrong
    var xpos = zposition * Math.cos(thetacam);
    var zpos = zposition * Math.sin(thetacam);
    var cameraMatrix = lookAt(vec3(xpos, 0, zpos), // do affine transformation on the eye to move the camera
        vec3(0, 0, 0),  
        vec3(0, 1, 0)); 
    var perspMatrix = GetPerspectiveProjectionMatrix(45, 0.05, 3.5);
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uCameraMatrix"), false, flatten(cameraMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uProjectionMatrix"), false, flatten(perspMatrix));
    var lightPosition = vec4(1.0, 1.0, -1.0, 0.0);
    gl.uniform4fv(gl.getUniformLocation(shaderProgram, "uLightPosition"), flatten(lightPosition));


    //possibly will cause issues if my path isn't right 
    const modelURL = "https://raw.githubusercontent.com/WinthropUniversity/csci440-fa21-project3-emjapo/main/Monkey.obj?token=AM6SBYWEZKLBWPDGLIOVBCDBW23DA"; // this changes but I don't know what caused it to change so hopefully it doesn't happen again

    const bananaURL = "https://raw.githubusercontent.com/WinthropUniversity/csci440-fa21-project3-emjapo/main/banana3.obj?token=AM6SBYXBW55KNTNAPTCOAFDBW23F4";

    const chickenURL = "https://raw.githubusercontent.com/WinthropUniversity/csci440-fa21-project3-emjapo/main/birdStuff/Matilda.obj?token=AM6SBYQJ4PJSNOPP3WBOB33BWPEY6";

    //const birdURL = "https://raw.githubusercontent.com/WinthropUniversity/csci440-fa21-project3-emjapo/main/birdStuff/bird.obj?token=AM6SBYSW73GIXI6JELMWYFTBWPBIO";

    const objFileContents = await FetchWrapper(modelURL);
    const bananaFileContents = await FetchWrapper(bananaURL);
    const chickenFileContents = await FetchWrapper(chickenURL);
    //const birdFileContents = await FetchWrapper(birdURL);

    var CuriousGeorge = new Friend(gl, shaderProgram, objFileContents);
    var Banana = new Friend(gl, shaderProgram, bananaFileContents);
    var MatildaRIP = new Friend(gl, shaderProgram, chickenFileContents);
    //var birdBrain = new Friend(gl, shaderProgram, birdFileContents);

    CuriousGeorge.SetMaterialProperties(vec4(1.0, 0.0, 0.0, 1.0), 10000.0, 1.0);
    Banana.SetMaterialProperties(vec4(1.0, 0.9, 0.0, 1.0), 10000.0, 0.0);
    MatildaRIP.SetMotion(1.0);
    
    // var image = new Image();
    // image.crossOrigin = "anonymous";  // to avoid the CORS error ...
    // image.src = "https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/master/Week11/falltexture.png";
    // image.onload = function () {
    //     CuriousGeorge.SetTextureProperties(image);
    // }
    // image.crossOrigin = "anonymous";  // to avoid the CORS error ...
    // image.src = "https://raw.githubusercontent.com/WinthropUniversity/CSCI440-Examples/master/Week11/falltexture.png";
    

    // get slider values (not sure this is the best location)

    handleCameraPosition();
    
    var theta = 0.0;

    document.getElementById("rotatez").oninput = function(event) {
        handleCameraPosition();
        render([CuriousGeorge, Banana, MatildaRIP], theta);
    };
    document.getElementById("rotatey").oninput = function (event) {
        handleCameraPosition();
        render([CuriousGeorge, Banana, MatildaRIP], theta);
    };

    render([CuriousGeorge, Banana, MatildaRIP], theta);
    //window.requestAnimFrame(function () { MatildaRIP.Translate
}

window.onload = function init() {
    main();
}