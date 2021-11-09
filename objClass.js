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
        //// try to extract the normals and the texture coordinates from the obj file
        this.normals = EstimateNormalsFromTriangles(this.points);

        this.textureImage = null;
        this.textureID = null;
        this.texturePoints = [];
        for (let i = 0; i < this.points.length; i++) {
            this.texturePoints.push( vec2(-1,-1));
        }

        this.LoadDataOnGPU();


        //set up lighting
        this.SetMaterialProperties(vec4(1.0, 0.75, 0.25, 1.0), 100.0);
        this.SetLightingProperties(vec4(0.25, 0.25, 0.25, 1.0),   // ambient, low-level
                                   vec4(1.0, 1.0, 1.0, 1.0),   // diffuse, white
                                   vec4(1.0, 1.0, 1.0, 1.0));  // specular, white

        //this.shapeBufferID = this.gl.createBuffer();                                
        //this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.shapeBufferID);                      
        //this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.points), this.gl.STATIC_DRAW); 

        // var posVar = this.gl.getAttribLocation(this.shaderProgram, "vPosition"); 
        // this.gl.vertexAttribPointer(posVar, 4, this.gl.FLOAT, false, 0, 0);     
        // this.gl.enableVertexAttribArray(posVar);


        // // set color/normals
        // this.colorBufferID = this.gl.createBuffer();                                  
        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBufferID);                       
        // this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.normals), this.gl.STATIC_DRAW); 
        
        // var colorVar = this.gl.getAttribLocation(this.shaderProgram, "vNormal"); 
        // this.gl.vertexAttribPointer(colorVar, 3, this.gl.FLOAT, false, 0, 0);         
        // this.gl.enableVertexAttribArray(colorVar);

    }

    LoadDataOnGPU() {
        // this will have a lot of code ugh
    }

    SetMaterialProperties(materialColor, materialShininess) {
        this.ambientMaterial = materialColor
        this.diffuseMaterial = materialColor
        this.specularMaterial = materialColor;
        this.shininess = materialShininess;
    }

    SetLightingProperties(ambientLightColor, diffuseLightColor, specularLightColor) {
        this.ambientLight = ambientLightColor;
        this.diffuesLight = diffuseLightColor;
        this.specularLight = specularLightColor;
    }

    SetTextureProperties(textureImage) {
        this.textureImage = textureImage;

        this.textureID = this.gl.createTexture();
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureID);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

        // turn the image into a texture
        this.gl.texImage2D(this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            this.textureImage);

        // now for the mipmap, Still a little confused about what this is
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.texParameteri(this.gl.TEXTURE_2D,
            this.gl.TEXTURE_MIN_FILTER,
            this.gl.NEAREST_MIPMAP_LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D,
            this.gl.TEXTURE_MAG_FILTER,
            this.gl.LINEAR);

        this.texturePoints = this.ExtractTextureCoordsForRectangularFaces(this.points);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBufferID);   
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.texturePoints), this.gl.STATIC_DRAW);
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