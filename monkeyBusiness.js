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
// The global objects list to cheat for rendering
var gObjectsList = [];

// The global gl and shader hooks to cheat for rendering
var ggl = null;
var gShaderProgram = null;
var gCanvas = null;


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
function GetModelTransformationMatrix(rotateXDegree, rotateYDegree, rotateZDegree) {
    var Identity = mat4(1.0, 0.0, 0.0, 0.0,
                            0.0, 1.0, 0.0, 0.0,
                            0.0, 0.0, 1.0, 0.0,
                            0.0, 0.0, 0.0, 1.0);
   
    var cosx = Math.cos(rotateXDegree * (Math.PI/180));
    var sinx = Math.sin(rotateXDegree * (Math.PI / 180));

    var cosy = Math.cos(rotateYDegree * (Math.PI / 180));
    var siny = Math.sin(rotateYDegree * (Math.PI / 180));

    var cosz = Math.cos(rotateZDegree * (Math.PI / 180));
    var sinz = Math.sin(rotateZDegree * (Math.PI / 180));

   var scalingMatrix = mat4(0.6, 0.0, 0.0, 0.0,
                            0.0, 0.6, 0.0, 0.0,
                            0.0, 0.0, 0.6, 0.0,
                            0.0, 0.0, 0.0, 1.0 );
    //var scalingMatrix = Identity;
    
    var rotationY = mat4(cosy, 0.0, siny, 0.0,
                        0.0, 1.0, 0.0, 0.0,
                        -siny, 0.0, cosy, 0.0,
                        0.0, 0.0, 0.0, 1.0);

    var rotationX = mat4(1.0, 0.0, 0.0, 0.0,
                        0.0, cosx, -sinx, 0.0,
                        0.0, sinx, cosx, 0.0,
                        0.0, 0.0, 0.0, 1.0 );

    var rotationZ = mat4(cosz, -sinz, 0.0, 0.0,
                        sinz, cosz, 0.0, 0.0,
                        0.0, 0.0, 1.0, 0.0,
                        0.0, 0.0, 0.0, 1.0);

    if (rotateXDegree == 0.0) {
        rotationX = Identity;
    }
    if (rotateYDegree == 0.0) {
        rotationY = Identity;
    }
    if (rotateZDegree == 0.0) {
        rotationZ = Identity;
    }
    return (mult(rotationZ, mult(rotationX, mult(rotationY, scalingMatrix))));
    //return scalingMatrix;
}

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
    var zposition = parseFloat(document.getElementById("zcamera").value);
    var thetacam = parseFloat(document.getElementById("thetacamera").value);
    var xpos = zposition * Math.cos(thetacam);
    var zpos = zposition * Math.sin(thetacam);
    var cameraMatrix = lookAt(vec3(xpos, 0, zpos),  // Location of camera 
        vec3(0, 0, 0),  // Where camera is looking
        vec3(0, 1, 0)); // Which way is "up"

    gl.uniformMatrix4fv(ggl.getUniformLocation(gShaderProgram, "uCameraMatrix"), false, flatten(cameraMatrix));

    render();
}



//************** Pretty sure this can be removed but I will save it until I am absolutely positive **************/
// // Same old load data on the GPU function
// function LoadDataOnGPU(gl, myData, shaderVariableStr, shaderVariableDim, shaderProgram) {
//     var bufferID = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, bufferID);
//     gl.bufferData(gl.ARRAY_BUFFER, flatten(myData), gl.STATIC_DRAW);

//     if (shaderVariableStr != "") {
//         var myVar = gl.getAttribLocation(shaderProgram, shaderVariableStr);
//         gl.vertexAttribPointer(myVar, shaderVariableDim, gl.FLOAT, false, 0, 0);
//         gl.enableVertexAttribArray(myVar);
//     }

//     return bufferID;
// }


// Set up the shaders, this will almost definitely need to be changed later
function setupShaders(gl) {
    var vertexShaderCode = "attribute vec4 vPosition;" +
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
        "   vec3 E = -normalize(vertexPos);" +
        "   vec3 H = normalize(L+E);" +
        "   vec3 N = normalize( (uModelMatrix * vec4(vNormal,0.0)).xyz );" +
        "   vec4 ambient = uAmbientProduct;" +
        "   vec4 diffuse = max( dot(L,N), 0.0) * uDiffuseProduct;" +
        "   vec4 specular = pow( max( dot(N,H), 0.0), uShininess) * uSpecularProduct;" +
        "   if ( dot(L,N) < 0.0) specular = vec4(0.0, 0.0, 0.0, 1.0);" +
        "   fColor = ambient + diffuse + specular;" + //get color
        "   fColor.a = 1.0;" +
        "   fTexCoord = vTexCoord;" +
        "   gl_Position = uProjectionMatrix * uCameraMatrix * uModelMatrix * vPosition;" + // set position with perspectives
        "   gl_Position.x = gl_Position.x / gl_Position.w;" +
        "   gl_Position.y = gl_Position.y / gl_Position.w;" +
        "   gl_Position.z = gl_Position.z / gl_Position.w;" +
        "   gl_Position.w = 1.0;" +
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
        "varying  vec2 fTexCoord;" +
        "uniform sampler2D texture;" +
        "void main() {" +
        "    if (fTexCoord.x < 0.0)" +  
        "      gl_FragColor = fColor;" +
        "    else" +
        "      gl_FragColor = fColor*texture2D( texture, fTexCoord );" + 
        "}"
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

    return shaderProgram;
}


// Another functions that will be refactored later but for now I am just concerned with if my obj file will be rendered
function render(gl, monkeyList, shaderProgram, rotationList) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // var modelMatrixLoc = gl.getUniformLocation(shaderProgram, "uModelMatrix");
    // var modelMatrix = GetModelTransformationMatrix(rotationList[0], rotationList[1], rotationList[2]);

    for (let monkeyIdx = 0; monkeyIdx < monkeyList.length; monkeyIdx++) {
        monkeyList[monkeyIdx].ResetMatrix();
        monkeyList[0].Translate(0.5, 0.0, 0.0);
        monkeyList[1].Translate(-2.4, -0.2, 0.0);
        monkeyList[1].Scale(0.6, 0.6, 0.6);
        monkeyList[1].RotateX(45);
        monkeyList[1].RotateY(45);
        monkeyList[monkeyIdx].GetMatrix(rotationList[0], rotationList[1], rotationList[2]);
        monkeyList[monkeyIdx].DrawMonkey();
    }
    // console.log(modelMatrix);
    // gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));

    // gl.drawArrays(gl.TRIANGLES, 0, pointLength);
}

// main function that invokes all of the other functions
async function main() {
    var canvas = document.getElementById("gl-canvas");
    var gl = WebGLUtils.setupWebGL(canvas);
    if(!gl) {
        alert("WebGL is not available");
    }
    

    gl.viewport(0, 0, canvas.clientWidth, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var shaderProgram = setupShaders(gl);


    var zposition = parseFloat(document.getElementById("rotatez").value);
    var thetacam = parseFloat(document.getElementById("rotatey").value); // wrong
    var xpos = zposition * Math.cos(thetacam);
    var zpos = zposition * Math.sin(thetacam);
    var cameraMatrix = lookAt(vec3(xpos, 0, zpos), // do affine transformation on the eye to move the camera
        vec3(0, 0, 0),  
        vec3(0, 1, 0)); 
    var perspMatrix = GetPerspectiveProjectionMatrix(45, 0.05, 3.0);
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uCameraMatrix"), false, flatten(cameraMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uProjectionMatrix"), false, flatten(perspMatrix));
    var lightPosition = vec4(1.0, 1.0, -1.0, 0.0);
    gl.uniform4fv(gl.getUniformLocation(shaderProgram, "uLightPosition"), flatten(lightPosition));


    //possibly will cause issues if my path isn't right 
    const modelURL = "https://raw.githubusercontent.com/WinthropUniversity/csci440-fa21-project2-emjapo/main/Monkey.obj?token=AM6SBYRUDDXFW22K7RDYYWTBVREWG"; // this changes but I don't know what caused it to change so hopefully it doesn't happen again

    const bananaURL = "https://raw.githubusercontent.com/WinthropUniversity/csci440-fa21-project2-emjapo/main/banana3.obj?token=AM6SBYTUMCDSGGGOFHDZHG3BVRETS";

    const objFileContents = await FetchWrapper(modelURL);
    const bananaFileContents = await FetchWrapper(bananaURL);

    var CuriousGeorge = new FunkyMonkey(gl, shaderProgram, objFileContents);
    var Banana = new FunkyMonkey(gl, shaderProgram, bananaFileContents);

    var rotateXDegree = 0.0;
    var rotateYDegree = 0.0;
    var rotateZDegree = 0.0;

    // get slider values (not sure this is the best location)

    document.getElementById("rotatez").oninput = handleCameraPosition;
    document.getElementById("rotatey").oninput = handleCameraPosition;


    // document.getElementById("rotatey").oninput = function (event) {
    //     rotateYDegree = parseFloat(event.target.value);
    //     render(gl, [CuriousGeorge, Banana], shaderProgram, [rotateXDegree, rotateYDegree, rotateZDegree]);
    // };
    // document.getElementById("rotatez").oninput = function (event) {
    //     rotateZDegree = parseFloat(event.target.value);
    //     render(gl, [CuriousGeorge, Banana], shaderProgram, [rotateXDegree, rotateYDegree, rotateZDegree]);
    // };

    // window.requestAnimFrame(function () { render(gl, [CuriousGeorge, Banana], shaderProgram, [rotateXDegree, rotateYDegree, rotateZDegree]) });
    render(gl, [CuriousGeorge, Banana], shaderProgram, [rotateXDegree, rotateYDegree, rotateZDegree]);
}

window.onload = function init() {
    main();
}