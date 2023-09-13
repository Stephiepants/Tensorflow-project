/**
 * @license
 * Copyright 2023 Google LLC.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */



import * as posedetection from '@tensorflow-models/pose-detection';
import * as scatter from 'scatter-gl';

import * as params from './params';

// These anchor points allow the pose pointcloud to resize according to its
// position in the input.
const ANCHOR_POINTS = [[0, 0, 0], [0, 1, 0], [-1, 0, 0], [-1, -1, 0]];

// #ffffff - White
// #800000 - Maroon
// #469990 - Malachite
// #e6194b - Crimson
// #42d4f4 - Picton Blue
// #fabed4 - Cupid
// #aaffc3 - Mint Green
// #9a6324 - Kumera
// #000075 - Navy Blue
// #f58231 - Jaffa
// #4363d8 - Royal Blue
// #ffd8b1 - Caramel
// #dcbeff - Mauve
// #808000 - Olive
// #ffe119 - Candlelight
// #911eb4 - Seance
// #bfef45 - Inchworm
// #f032e6 - Razzle Dazzle Rose
// #3cb44b - Chateau Green
// #a9a9a9 - Silver Chalice
const COLOR_PALETTE = [
  '#ffffff', '#800000', '#469990', '#e6194b', '#42d4f4', '#fabed4', '#aaffc3',
  '#9a6324', '#000075', '#f58231', '#4363d8', '#ffd8b1', '#dcbeff', '#808000',
  '#ffe119', '#911eb4', '#bfef45', '#f032e6', '#3cb44b', '#a9a9a9'
];



export class RendererCanvas2d {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.scatterGLEl = document.querySelector('#scatter-gl-container');
    this.scatterGL = new scatter.ScatterGL(this.scatterGLEl, {
      'rotateOnStart': true,
      'selectEnabled': false,
      'styles': {polyline: {defaultOpacity: 1, deselectedOpacity: 1}}
    });
    this.scatterGLHasInitialized = false;
    this.videoWidth = canvas.width;
    this.videoHeight = canvas.height;
    this.flip(this.videoWidth, this.videoHeight);
  }





  flip(videoWidth, videoHeight) {
    // Because the image from camera is mirrored, need to flip horizontally.
    this.ctx.translate(videoWidth, 0);
    this.ctx.scale(-1, 1);

    this.scatterGLEl.style =
        `width: ${videoWidth}px; height: ${videoHeight}px;`;
    this.scatterGL.resize();

    this.scatterGLEl.style.display =
        params.STATE.modelConfig.render3D ? 'inline-block' : 'none';
  }

  draw(rendererParams) {
    const [video, poses, isModelChanged] = rendererParams;
    this.drawCtx(video);

    // The null check makes sure the UI is not in the middle of changing to a
    // different model. If during model change, the result is from an old model,
    // which shouldn't be rendered.
    if (poses && poses.length > 0 && !isModelChanged) {
      this.drawResults(poses);
    }
  }

  drawCtx(video) {
    this.ctx.drawImage(video, 0, 0, this.videoWidth, this.videoHeight);
  }

  clearCtx() {
    this.ctx.clearRect(0, 0, this.videoWidth, this.videoHeight);
  }

  /**
   * Draw the keypoints and skeleton on the video.
   * @param poses A list of poses to render.
   */
  drawResults(poses) {
    for (const pose of poses) {
      this.drawResult(pose);
    }
  }

  /**
   * Draw the keypoints and skeleton on the video.
   * @param pose A pose with keypoints to render.
   */
  drawResult(pose) {
    if (pose.keypoints != null) {
      this.drawKeypoints(pose.keypoints);
      this.drawSkeleton(pose.keypoints, pose.id);
    }
    if (pose.keypoints3D != null && params.STATE.modelConfig.render3D) {
      this.drawKeypoints3D(pose.keypoints3D);
    }
  }



  /**
   * Draw the keypoints on the video.
   * @param keypoints A list of keypoints.
   */

  drawKeypoints(keypoints) {
    const keypointInd = posedetection.util.getKeypointIndexBySide(params.STATE.model);
    this.ctx.fillStyle = 'White'; // Red midpoint nose
    this.ctx.strokeStyle = 'White'; // White, color outside circle keypoint
    this.ctx.lineWidth = params.DEFAULT_LINE_WIDTH;

    /* Define the indices of keypoints that you want to draw
    const keypointIndicesRightArm = [6, 8, 10];
    const keypointCoordinatesRightArm = keypointIndicesRightArm.map(i => ({
      x: keypoints[i].x,
      y: keypoints[i].y
    })); */

    for (const i of keypointInd.middle) {
      this.drawKeypoint(keypoints[i]); // middle
    }


    this.ctx.fillStyle = 'Green'; // Left side
    for (const i of keypointInd.left) {
      this.drawKeypoint(keypoints[i]);

    // This is where the code was for calculating angles and displaying them. Had to
    // move them cause the this.ctx.strokStyle showed the keypoints and not the lines

    }

    this.ctx.fillStyle = 'Red'; // Right side
    for (const i of keypointInd.right) {
      this.drawKeypoint(keypoints[i]);

    }

}

// function calculating angles and converts to degrees
 calculateAngle(part1, part2, part3) {
    // Calculation of the angles from keypoints
    const angleRadians = Math.atan2(part3.y - part2.y, part3.x - part2.x) - Math.atan2(part1.y - part2.y, part1.x - part2.x);
    let angleDegrees = angleRadians * (180 / Math.PI);

    // Ensure angle is positive and in the range [0, 360]
    angleDegrees = (angleDegrees + 360) % 360;

    // only gives angle up to 180 degrees
    if (angleDegrees > 180) {
    angleDegrees = 360 - angleDegrees; // Ensure angle is in [0, 180]
  }

    return angleDegrees;
}

  drawKeypoint(keypoint) {
    // If score is null, just show the keypoint.
    const score = keypoint.score != null ? keypoint.score : 1;
    const scoreThreshold = params.STATE.modelConfig.scoreThreshold || 0;

    if (score >= scoreThreshold) {
      const circle = new Path2D();
      circle.arc(keypoint.x, keypoint.y, params.DEFAULT_RADIUS, 0, 2 * Math.PI);
      this.ctx.fill(circle);
      this.ctx.stroke(circle);
    }

  }

  /**
   * Draw the skeleton of a body on the video.
   * @param keypoints A list of keypoints.
   */
  drawSkeleton(keypoints, poseId) {
    // Each poseId is mapped to a color in the color palette.
    const color = params.STATE.modelConfig.enableTracking && poseId != null ?
        COLOR_PALETTE[poseId % 20] :
        'Green';
    // Color of lines
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = params.DEFAULT_LINE_WIDTH;


    posedetection.util.getAdjacentPairs(params.STATE.model).forEach(([
                                                                      i, j
                                                                    ]) => {
      // puts keypoints in variables
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];

      // If score is null, just show the keypoint.
      const score1 = kp1.score != null ? kp1.score : 1;
      const score2 = kp2.score != null ? kp2.score : 1;
      const scoreThreshold = params.STATE.modelConfig.scoreThreshold || 0;

      if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
        this.ctx.beginPath();
        this.ctx.moveTo(kp1.x, kp1.y);
        this.ctx.lineTo(kp2.x, kp2.y);
        this.ctx.stroke();
      }

    // putting the keypoints in variables
    const leftShoulder = keypoints[5];
    const leftElbow = keypoints[7];
    const leftWrist = keypoints[9];

    // Get a reference to the angle-display div and the angle-value span
    const angleDisplay1 = document.getElementById("angle-display1");
    const angleDisplay2 = document.getElementById("angle-display2");
    const angleValue1 = document.getElementById("angle-value1");
    const angleValue2 = document.getElementById("angle-value2");



      // if the keypoints for the left arm are detected then enter if statement
   if (leftShoulder && leftElbow && leftWrist) {
     const angle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);

    //angleValue.textContent = angle.toFixed(2); // Display the angle with two decimal places, breaks the program

     angleDisplay1.textContent = `Angle left arm: ${angle.toFixed(2)} degrees`;  // Update the angle display message
     angleDisplay1.style.color = "Green"; // Set text color to green

    // if the angles is between range change color of line
    if(angle >= 15 && angle <= 100){
        this.ctx.beginPath();
        this.ctx.moveTo(leftShoulder.x, leftShoulder.y); // creates new line between chosen joints
        this.ctx.lineTo(leftElbow.x, leftElbow.y);
        this.ctx.strokeStyle = 'Green';
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(leftElbow.x, leftElbow.y);
        this.ctx.lineTo(leftWrist.x, leftWrist.y);
        this.ctx.strokeStyle = 'Green';
        this.ctx.stroke(); // Draw the line

     }

     else {
      this.ctx.beginPath();
        this.ctx.moveTo(leftShoulder.x, leftShoulder.y); // creates new line between chosen joints
        this.ctx.lineTo(leftElbow.x, leftElbow.y);
        this.ctx.strokeStyle = 'Blue';
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(leftElbow.x, leftElbow.y);
        this.ctx.lineTo(leftWrist.x, leftWrist.y);
        this.ctx.strokeStyle = 'Blue';
        this.ctx.stroke(); // Draw the line


     }

    // this.ctx.stroke(); // Draw the line

    }

    this.ctx.strokeStyle = color;

    if (keypoints[6] && keypoints[8] && keypoints[10]) {
     const angle1 = this.calculateAngle(keypoints[6], keypoints[8], keypoints[10]);


    //angleValue.textContent = angle.toFixed(2); // Display the angle with two decimal places, breaks the program

     angleDisplay2.textContent = `Angle right arm: ${angle1.toFixed(2)} degrees`;  // Update the angle display message

     angleDisplay2.style.color = "Green"; // Set text color to green

    // if the angles is between range change color of line to green or red
    if(angle1 <= 15 || angle1 >= 100){
        this.ctx.beginPath();
        this.ctx.moveTo(keypoints[6].x, keypoints[6].y);  // creates new line between chosen joints
        this.ctx.lineTo(keypoints[8].x, keypoints[8].y);
        this.ctx.strokeStyle = 'Red';
         this.ctx.stroke();


        this.ctx.beginPath();
        this.ctx.moveTo(keypoints[8].x, keypoints[8].y);
        this.ctx.lineTo(keypoints[10].x, keypoints[10].y);
        this.ctx.strokeStyle = 'Red'; //changes for git
        this.ctx.stroke();

     }

     else {
      this.ctx.beginPath();
      this.ctx.moveTo(keypoints[8].x, keypoints[8].y);
      this.ctx.lineTo(keypoints[10].x, keypoints[10].y);
      this.ctx.strokeStyle = 'Green';
      this.ctx.stroke();


     }

     //this.ctx.stroke(); // Draw the line
    }

    this.ctx.strokeStyle = color;

    });


  }


  drawKeypoints3D(keypoints) {
    const scoreThreshold = params.STATE.modelConfig.scoreThreshold || 0;
    const pointsData =
        keypoints.map(keypoint => ([-keypoint.x, -keypoint.y, -keypoint.z]));

    const dataset =
        new scatter.ScatterGL.Dataset([...pointsData, ...ANCHOR_POINTS]);

    const keypointInd =
        posedetection.util.getKeypointIndexBySide(params.STATE.model);
    this.scatterGL.setPointColorer((i) => {
      if (keypoints[i] == null || keypoints[i].score < scoreThreshold) {
        // hide anchor points and low-confident points.
        return '#ffffff';
      }
      if (i === 0) {
        return '#ff0000' /* Red #ff0000 */;
      }
      if (keypointInd.left.indexOf(i) > -1) {
        return '#00ff00' /* Green #00ff00 */;
      }
      if (keypointInd.right.indexOf(i) > -1) {
        return '#00ff00' /* Orange #ffa500 */;
      }

    });

    if (!this.scatterGLHasInitialized) {
      this.scatterGL.render(dataset);
    } else {
      this.scatterGL.updateDataset(dataset);
    }
    const connections = posedetection.util.getAdjacentPairs(params.STATE.model);
    const sequences = connections.map(pair => ({indices: pair}));
    this.scatterGL.setSequences(sequences);
    this.scatterGLHasInitialized = true;

  }

}




