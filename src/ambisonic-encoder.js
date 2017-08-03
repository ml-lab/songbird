/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @file Spatially encodes input using spherical harmonics.
 * @author Andrew Allen <bitllama@google.com>
 */

'use strict';

// Internal dependencies.
var AmbisonicEncoderTable = require('./ambisonic-encoder-table.js');
var AmbisonicEncoderTableMaxOrder = AmbisonicEncoderTable[0][0].length / 2;
var Utils = require('./utils.js');

/**
 * @class AmbisonicEncoder
 * @description Spatially encodes input using spherical harmonics.
 * @param {AudioContext} context
 * Associated {@link
https://developer.mozilla.org/en-US/docs/Web/API/AudioContext AudioContext}.
 * @param {Number} ambisonicOrder
 * Desired ambisonic Order.
 */
function AmbisonicEncoder (context, ambisonicOrder) {
  // Public variables.
  /**
   * Input to .connect() input AudioNodes to.
   * @member {AudioNode} input
   * @memberof AmbisonicEncoder
   */
  /**
   * Outuput to .connect() object from.
   * @member {AudioNode} output
   * @memberof AmbisonicEncoder
   */
  this._ambisonicOrder = ambisonicOrder;
  if (this._ambisonicOrder > AmbisonicEncoderTableMaxOrder) {
    Utils.log('(Error):\nUnable to render ambisonic order',
      ambisonic_order, '(Max order is', AmbisonicEncoderTableMaxOrder,
      ')\nUsing max order instead.');
    this._ambisonicOrder = AmbisonicEncoderTableMaxOrder;
  }

  var num_channels = (this._ambisonicOrder + 1) * (this._ambisonicOrder + 1);
  this._merger = context.createChannelMerger(num_channels);
  this._masterGain = context.createGain();
  this._channelGain = new Array(num_channels);
  for (var i = 0; i < num_channels; i++) {
    this._channelGain[i] = context.createGain();
    this._masterGain.connect(this._channelGain[i]);
    this._channelGain[i].connect(this._merger, 0, i);
  }

  // Input/Output proxy.
  this.input = this._masterGain;
  this.output = this._merger;
}

/**
 * Set the direction of the encoded source signal.
 * @param {Number} azimuth Azimuth (in degrees).
 * @param {Number} elevation Elevation (in degrees).
 */
AmbisonicEncoder.prototype.setDirection = function(azimuth, elevation) {
  // Format input direction to nearest indices.
  if (isNaN(azimuth)) {
    azimuth = 0;
  }
  if (isNaN(elevation)) {
    elevation = 0;
  }

  azimuth = Math.round(azimuth % 360);
  if (azimuth < 0) {
    azimuth += 360;
  }
  elevation = Math.round(Math.min(90, Math.max(-90, elevation))) + 90;

  // Assign gains to each output.
  for (var i = 1; i <= this._ambisonicOrder; i++) {
    for (var j = -i; j <= i; j++) {
      var acnChannel = (i * i) + i + j;
      var elevationIndex = i * (i + 1) / 2 + Math.abs(j) - 1;
      var val = AmbisonicEncoderTable[1][elevation][elevationIndex];
      if (j != 0) {
        var azimuthIndex = AmbisonicEncoderTableMaxOrder + j - 1;
        if (j < 0) {
          azimuthIndex = AmbisonicEncoderTableMaxOrder + j;
        }
        val *= AmbisonicEncoderTable[0][azimuth][azimuthIndex];
      }
      this._channelGain[acnChannel].gain.value = val;
    }
  }
}

module.exports = AmbisonicEncoder;