class Friend {
    constructor(gl, shaderProgram, objFileContents) {
        this.gl = gl;
        this.shaderProgram = shaderProgram;

        this.CreateFriendPoints(objFileContents);

        // Set the transformation matrix. Not sure how this will combine with the work I have done yet
        this.matrixLoc = gl.getUniformLocation(shaderProgram, "uModelMatrix");
        if (this.matrixLoc == null) {
            console.log("Couldn't find 'uModelMatrix', sorry.");
        }
        this.transformationMatrix = mat4 (1, 0, 0, 0,
                                        0, 1, 0, 0,
                                        0, 0, 1, 0,
                                        0, 0, 0, 1);
        this.gl.uniformMatrix4fv(this.matrixLoc, false, flatten(this.transformationMatrix));
    }

    //**************************/
    // Get the points
    // maybe just having the function calls from the main file will work
    CreateFriendPoints(objFileContents) {
        this.objData = SimpleObjParse(objFileContents);
        this.points = VerySimpleTriangleVertexExtraction(this.objData);
        //// try to extract the normals and the texture coordinates from the obj file
        // if (this.objData["normals"] !== 0) { // check for error
        //     this.normals = this.objData["normals"];
        // } else {
            this.normals = EstimateNormalsFromTriangles(this.points);
        // }

        this.textureImage = null;
        this.textureID = null;
        this.texturePoints = []; // is this where the texture coordinates from the obj file would go?
        for (let i = 0; i < this.points.length; i++) {
            this.texturePoints.push( vec2(-1,-1));
        }

        this.LoadDataOnGPU();


        //set up lighting
        this.SetMaterialProperties(vec4(1.0, 0.75, 0.25, 1.0), 100.0, 1.0);
        this.SetLightingProperties(vec4(0.5, 0.5, 0.5, 1.0),   
                                   vec4(1.0, 1.0, 1.0, 1.0),  
                                   vec4(1.0, 1.0, 1.0, 1.0)); 
        this.SetMotion(0.0);

    }

    LoadDataOnGPU() {
        // vertex data 
        this.vertexBufferID = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferID);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.points), this.gl.STATIC_DRAW);

        // associate shader pos variables with buffer data
        var posVar = this.gl.getAttribLocation(this.shaderProgram, "vPosition");
        this.gl.vertexAttribPointer(posVar, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(posVar);

        // normal data
        this.normalBufferID = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBufferID);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.normals), this.gl.STATIC_DRAW);

        // associate the normal data with the shader
        var normVar = this.gl.getAttribLocation(this.shaderProgram, "vNormal");
        this.gl.vertexAttribPointer(normVar, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(normVar);

        // texture coordinates
        this.textureBufferID = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBufferID);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.texturePoints), this.gl.STATIC_DRAW);

        //associate the texture coordinates in the shader
        var texVar = this.gl.getAttribLocation(this.shaderProgram, "vTexCoord");
        this.gl.vertexAttribPointer(texVar, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(texVar);
    }

    SetMaterialProperties(materialColor, materialShininess, mirror) {
        this.ambientMaterial = materialColor
        this.diffuseMaterial = materialColor
        this.specularMaterial = materialColor;
        this.shininess = materialShininess;
        this.mirror = mirror;
    }

    SetMotion(motion){
        this.motion = motion;
    }

    SetLightingProperties(ambientLightColor, diffuseLightColor, specularLightColor) {
        this.ambientLight = ambientLightColor;
        this.diffuseLight = diffuseLightColor;
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
            
        this.texturePoints = this.objData["textures"]; //  this is where the texture points should be added objData["texture"]
        // maybe try environment mapping with sky pictures
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBufferID);   
        this.gl.bufferData(this.gl.ARRAY_BUFFER, flatten(this.texturePoints), this.gl.STATIC_DRAW);
    }


    DrawFriend() {
        //position
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBufferID);
        var positionVar = this.gl.getAttribLocation(this.shaderProgram, "vPosition");
        this.gl.vertexAttribPointer(positionVar, 4, this.gl.FLOAT, false, 0, 0);
      
        //normals
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBufferID);
        var normalVar = this.gl.getAttribLocation(this.shaderProgram, "vNormal"); 
        this.gl.vertexAttribPointer(normalVar, 3, this.gl.FLOAT, false, 0, 0);

        //texture
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBufferID);
        var colorVar = this.gl.getAttribLocation(this.shaderProgram, "vTexCoord");
        this.gl.vertexAttribPointer(colorVar, 2, this.gl.FLOAT, false, 0, 0);

        //lighting and stuff
        var ambientProduct = mult(this.ambientLight, this.ambientMaterial);
        this.gl.uniform4fv(this.gl.getUniformLocation(this.shaderProgram, "uAmbientProduct"), flatten(ambientProduct));

        var diffuseProduct = mult(this.diffuseLight, this.diffuseMaterial);
        this.gl.uniform4fv(this.gl.getUniformLocation(this.shaderProgram, "uDiffuseProduct"), flatten(diffuseProduct));

        var specularProduct = mult(this.specularLight, this.specularMaterial);
        this.gl.uniform4fv(this.gl.getUniformLocation(this.shaderProgram, "uSpecularProduct"), flatten(specularProduct));

        this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram, "uShininess"), this.shininess);

        // to designate if it will use environment mapping or not
        this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram, "uMirror"), this.mirror);

        this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram, "uMotion"), this.motion);

        //transformation matrix
        this.gl.uniformMatrix4fv(this.matrixLoc, false, flatten(this.transformationMatrix));

        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.points.length);
    }


    /**************************Matrix Stuff**************************/

    ResetMatrix() {
        this.transformationMatrix = mat4(1.0, 0.0, 0.0, 0.0,
                                        0.0, 1.0, 0.0, 0.0,
                                        0.0, 0.0, 1.0, 0.0,
                                        0.0, 0.0, 0.0, 1.0)
    }


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

    RotateZ(angle) {
        var cs = Math.cos(angle * Math.PI / 180.0);
        var sn = Math.sin(angle * Math.PI / 180.0);

        var Rz = mat4(cs, -sn, 0.0, 0.0,
                    sn, cs, 0.0, 0.0,
                    0.0, 0.0, 1.0, 0.0,
                    0.0, 0.0, 0.0, 1.0);

        this.transformationMatrix = mult(Rz, this.transformationMatrix);
    }


    GetMatrix(rotateX, rotateY, rotateZ) {
        this.transformationMatrix = mult(GetModelTransformationMatrix(rotateX, rotateY, rotateZ), this.transformationMatrix); //preserves translation, but Z is zeroed out
        // I think the matrix needs to be reset but I'm not sure where that should happen
        //this.transformationMatrix = GetModelTransformationMatrix(rotateX, rotateY, rotateZ); // this gets rid of the translation
    }

}