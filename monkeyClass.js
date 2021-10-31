// I am going to try the class thing but instead of a ship I will have a monkey
// it would be really cool to have a banana but for now I will just go with two monkeys

class FunkyMonkey {
    constructor(gl, shaderProgram, objFileContents) {
        this.gl = gl;
        this.shaderProgram = shaderProgram;

        this.CreateMonkeyPoints(objFileContents);

        // Set the transformation matrix. Not sure how this will combine with the work I have done yet
        this.matrixLoc = gl.getUniformLocation(shaderProgram, "uModelMatrix");
        if (this.matrixLoc == null) {
            console.log("Couldn't find 'uMatrix', sorry sis.");
        }
        this.transformationMatrix = mat4 (1, 0, 0, 0,
                                        0, 1, 0, 0,
                                        0, 0, 1, 0,
                                        0, 0, 0, 1);
        this.gl.uniformMatrix4fv(this.matrixLoc, false, flatten(this.transformationMatrix));
    }

    //************************* */
    // Get the points
    // maybe just having the function calls from the main file will work
    CreateMonkeyPoints(objFileContents) {
        this.objData = SimpleObjParse(objFileContents);
        this.points = VerySimpleTriangleVertexExtraction(this.objData);
        this.normals = EstimateNormalsFromTriangles(this.points);

        this.shapeBufferID = this.gl.createBuffer();                                
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.shapeBufferID);                      
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.points), this.gl.STATIC_DRAW); 

        var posVar = this.gl.getAttribLocation(this.shaderProgram, "vPosition"); 
        this.gl.vertexAttribPointer(posVar, 4, this.gl.FLOAT, false, 0, 0);     
        this.gl.enableVertexAttribArray(posVar);


        // set color/normals
        this.colorBufferID = this.gl.createBuffer();                                  
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBufferID);                       
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.normals), this.gl.STATIC_DRAW); 
        
        var colorVar = this.gl.getAttribLocation(this.shaderProgram, "vNormal"); 
        this.gl.vertexAttribPointer(colorVar, 3, this.gl.FLOAT, false, 0, 0);         
        this.gl.enableVertexAttribArray(colorVar);

    }

    DrawMonkey() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.shapeBufferID); 
        var positionVar = this.gl.getAttribLocation(this.shaderProgram, "vPosition");
        this.gl.vertexAttribPointer(positionVar, 4, this.gl.FLOAT, false, 0, 0);

        //// color questionable, I'll be back
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBufferID);          
        var colorVar = this.gl.getAttribLocation(this.shaderProgram, "vNormal"); 
        this.gl.vertexAttribPointer(colorVar, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.uniformMatrix4fv(this.matrixLoc, false, flatten(this.transformationMatrix));

        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.points.length);
    }

    ResetMatrix() {
        this.transformationMatrix = mat4(1.0, 0.0, 0.0, 0.0,
                                        0.0, 1.0, 0.0, 0.0,
                                        0.0, 0.0, 1.0, 0.0,
                                        0.0, 0.0, 0.0, 1.0)
    }

    // I think I can skip all of the other ones since I want the whole scene to rotate together, so I'll leave that in the other file and this one will just have translate

    Translate(tx, ty, tz) {
        // Setup the translation matrix
        var T = mat4(1.0, 0.0, 0.0, tx,
                    0.0, 1.0, 0.0, ty,
                    0.0, 0.0, 1.0, tz,
                    0.0, 0.0, 0.0, 1.0);

        // Update the ship's transformation matrix
        this.transformationMatrix = mult(T, this.transformationMatrix);
    }

    // the banana is too big and scaling here is probably the easiest way
    // also I want to see a different angle of the banana

    Scale(sx, sy, sz) {
        // Setup the translation matrix
        var S = mat4(sx, 0.0, 0.0, 0,
            0.0, sy, 0.0, 0,
            0.0, 0.0, sz, 0,
            0.0, 0.0, 0.0, 1.0);

        this.transformationMatrix = mult(S, this.transformationMatrix);
    }

    RotateY(angle) {
        var cs = Math.cos(angle * Math.PI / 180.0);
        var sn = Math.sin(angle * Math.PI / 180.0);

        var Ry = mat4(cs, 0.0, sn, 0.0,
            0.0, 1.0, 0.0, 0.0,
            -sn, 0.0, cs, 0.0,
            0.0, 0.0, 0.0, 1.0);

        this.transformationMatrix = mult(Ry, this.transformationMatrix);
    }

    RotateX(angle) {
        var cs = Math.cos(angle * Math.PI / 180.0);
        var sn = Math.sin(angle * Math.PI / 180.0);

        var Rx = mat4(1.0, 0.0, 0.0, 0.0,
            0.0, cs, -sn, 0.0,
            0.0, sn, cs, 0.0,
            0.0, 0.0, 0.0, 1.0);

        this.transformationMatrix = mult(Rx, this.transformationMatrix);
    }


    GetMatrix(rotateX, rotateY, rotateZ) {
        this.transformationMatrix = mult(GetModelTransformationMatrix(rotateX, rotateY, rotateZ), this.transformationMatrix); //preserves translation, but Z is zeroed out
        // I think the matrix needs to be reset but I'm not sure where that should happen
        //this.transformationMatrix = GetModelTransformationMatrix(rotateX, rotateY, rotateZ); // this gets rid of the translation
    }

}