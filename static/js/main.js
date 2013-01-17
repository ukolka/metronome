// requestAnimFrame shim
window.requestAnimFrame = (function () {
    "use strict";
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
}());

// wait for everything to load (including svg) before kicking off
window.addEventListener('load', function () {
    "use strict";
    var container = document.querySelector('#metronome'), // the 'embed' tag that holds the svg
        containerHeight = $(container).height(), // height of the 'embed' element
        metronome = container.getSVGDocument(), // or .contentDocument
        svgHeight = parseInt(metronome.rootElement.getAttribute('height'), 10), // height of the svg
        pendulum = metronome.getElementById('rect6537'), // pendulum 'rect' element
        pendulumX = parseInt(pendulum.getAttribute('x'), 10), // x coordinate of the top left corner of the pendulum
        pendulumY = parseInt(pendulum.getAttribute('y'), 10), // y coordinate of the top left corner of the pendulum
        pendulumWidth = parseInt(pendulum.getAttribute('width'), 10), // width of the pendulum
        pendulumHeight = parseInt(pendulum.getAttribute('height'), 10), // height of the pendulum
        weight = metronome.getElementById('path6544'), // weight 'path' element
        pendulumWithWeight = metronome.getElementById('g3203'), // grouped pendulum and weight 'g' element

        // rotation origin for the pendulum and the weight group
        pendRotOrigin = {x: pendulumX + pendulumWidth / 2,
                   y: pendulumY + pendulumHeight},


        // controls
        tempoDisplay = metronome.getElementById('tspan3928'), // tempo numeric display
        tempoDescrDisplay = metronome.getElementById('tspan7508-2-8-0-1-0-8-7-6'), // tempo name display
        startButton = metronome.getElementById('tspan3172'),
        tapButton = metronome.getElementById('tspan3176'),

        /**
         * According to http://en.wikipedia.org/wiki/Tempo#Basic_tempo_markings
         * For tempo given as an integer returns it's name if any applicable.
         */
        tempoMarking = function (tempo) {
            var result = '';
            if (tempo <= 19) {
                result = 'Larghissimo';
            } else if (tempo < 40) {
                result = 'Grave';
            } else if (tempo < 45) {
                result = 'Lento';
            } else if (tempo < 50) {
                result = 'Largo';
            } else if (tempo < 55) {
                result = 'Larghetto';
            } else if (tempo < 65) {
                result = 'Adagio';
            } else if (tempo < 69) {
                result = 'Adagietto';
            } else if (tempo < 72) {
                result = 'Andante moderato';
            } else if (tempo < 77) {
                result = 'Andante';
            } else if (tempo < 83) {
                result = 'Andantino';
            } else if (tempo < 85) {
                result = 'Marcia moderato';
            } else if (tempo < 97) {
                result = 'Moderato';
            } else if (tempo < 109) {
                result = 'Allegretto';
            } else if (tempo < 132) {
                result = 'Allegro';
            } else if (tempo < 140) {
                result = 'Vivace';
            } else if (tempo < 150) {
                result = 'Vivacissimo';
            } else if (tempo < 167) {
                result = 'Allegrissimo';
            } else if (tempo < 177) {
                result = 'Presto';
            } else if (tempo > 177) {
                result = 'Prestissimo';
            }
            return result;
        },

        /**
         * Returns y coordinate scaled in terms of original svg height.
         */
        scaleY = function (y) {
            return y / containerHeight * svgHeight;
        },
        /**
        * Web Audio
        */
        audioContext, // webkitAudioContext
        metronomeClickBuffer, // preloaded sound
        metronomeVolume = document.querySelector('#volume'), // volume 'range' element
        /**
         * Build chain of audioContext nodes starting with source
         * and ending with audioContext.destination.
         */
        routeSound = function (source) {
            var volume = metronomeVolume.value,
                gainNode = audioContext.createGainNode();
            gainNode.gain.value = volume / 15;
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            return source;
        },
        /**
         * Sound constructor. Helps get information from already scheduled sounds.
         */
        Sound = function (buffer, playAt) {
            var source = audioContext.createBufferSource();
            source.buffer = buffer;
            source = routeSound(source);
            source.noteOn(playAt);
            this.source = source;
            this.stop = function () {
                this.source.noteOff(0);
            };
            this.playAt = playAt;
        },
        /**
         * Asynchronous load of the sound file.
         */
        loadMetronomeSound = function (url) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'arraybuffer';
            // Decode asynchronously
            request.onload = function () {
                audioContext.decodeAudioData(request.response, function (buffer) {
                    metronomeClickBuffer = buffer;
                });
            };
            request.send();
        },
        /**
         * Tries to create the audioContext and load the sound.
         */
        loadAudio = function () {
            var span, text;
            try {
                audioContext = new webkitAudioContext();
            } catch (e) {
                span = document.createElement('span');
                text = document.createTextNode('Web Audio API is not supported in this browser :(');
                span.appendChild(text);
                metronomeVolume.parentNode.replaceChild(span, metronomeVolume);
            }
            loadMetronomeSound("sound/54406__korgms2000b__metronome-click.wav");
        },
        /**
        * End of Web Audio
        */

        // Tempo settings
        maxTempo = 208,
        tempoSteps = 168, // from 40 to 208
        // Global current tempo
        tempo = maxTempo, // global current tempo

        /**
         * Metronome sound
         */
        isPlaying = false, // is metronome currently playing or not
        lookahead = 5, // lookahead in beats
        beatsBuffer = [], // stores scheduled beats
        startTime, // audioContext time of when metronome started
        secondsBetweenBeats, // distance between beats in seconds
        rescheduleTimer, // timer id for rescheduilng timeout
        /**
         * Passes through scheduled beats.
         * Cleans beats that already played.
         * Adds new beats correspondingly.
         */
        reschedule = function () {
            var i, currentTime = audioContext.currentTime,
                lastBeatTime = beatsBuffer[lookahead - 1].playAt;
            for (i = 0; i < lookahead; i += 1) {
                if (beatsBuffer[i].playAt > currentTime) {
                    break;
                }
                beatsBuffer.push(new Sound(metronomeClickBuffer, lastBeatTime + secondsBetweenBeats * (i + 1)));
            }
            beatsBuffer.splice(0, i);
        },
        /**
         * Creates beats queue. And kicks off rescheduling.
         */
        schedule = function () {
            var i;
            startTime = audioContext.currentTime;
            secondsBetweenBeats = 60 / tempo;
            for (i = 0; i < lookahead; i += 1) {
                beatsBuffer.push(new Sound(metronomeClickBuffer, startTime + secondsBetweenBeats * i));
            }
            // timer is set to 1 sec because in chrome hidden tab it's anyway 1 sec
            rescheduleTimer = setInterval(reschedule, 1000);
        },
        /**
         * Clears the queue.
         */
        unSchedule = function () {
            var i;
            for (i = 0; i < lookahead; i += 1) {
                beatsBuffer.pop().stop();
            }
            clearInterval(rescheduleTimer);
        },
        /**
         * Starts / stops the metronome.
         * Is called by the click on the "Start" button.
         */
        play = function () {
            var result;
            isPlaying = !isPlaying;

            if (isPlaying) {
                schedule();
                result = 'Stop';
            } else {
                unSchedule();
                result = 'Start';
            }
            return result;
        },
        /**
         * End of metronome sound
         */

        /**
         * Animation
         */
        frames = 0, // keeps track of current frame number
        draw = function () {
            var currentTime, angle, rotate, timeDiff, beatNumber;
            if (isPlaying && frames % 5 === 0) { // execute every 5th frame if the metronome is playing
                currentTime = audioContext.currentTime; // get current audio context's time
                timeDiff = currentTime - startTime; // calculate elapsed time
                angle = (Math.round(((timeDiff / secondsBetweenBeats) % 1) * 10) - 5) * 2; // make an angle between -10 and 10
                beatNumber = Math.floor(timeDiff / secondsBetweenBeats);
                if (beatNumber % 2 === 0) { // every other beat pendulum goes in the opposite direction
                    angle = -angle;
                }
                if (tempo > 80) { // a bit of black magic to adjust pendulum's amplitude for more than 80 bpm
                    angle = 10 - angle < 6 ? 10 : angle;
                    angle = -10 - angle > -6 ? -10 : angle;
                }
                // a dirty little correction for the pendulum's motion to look symmetric
                angle -= 1;
                // animate the pendulum and the weight
                rotate = 'rotate (' + angle + ' ' + pendRotOrigin.x + ' ' + pendRotOrigin.y + ')';
                pendulumWithWeight.setAttribute('transform', rotate);
            }
            frames += 1;
            window.requestAnimFrame(draw); // continue animation
        },
        /**
         * end of Animation
         */

        // Dragging of the weight.
        dragging = null, // is weight being dragged
        dragStartY = containerHeight * 0.67243, // lower bound of weight dragging
        dragEndY = containerHeight * 0.065, // upper bound of weight dragging

        // Previous tap timestamp
        prevTapStamp = null;

    // Set cursors
    weight.setAttribute('cursor', 'move');
    startButton.setAttribute('cursor', 'pointer');
    tapButton.setAttribute('cursor', 'pointer');

    // Set callbacks
    $(metronome).on('mousemove', function (e) {
        var delta_y;
        if (dragging !== null) {
            // dragging weight
            if (dragging === weight) {
                if (e.pageY > dragEndY && e.pageY < dragStartY) {
                    delta_y = e.pageY - dragStartY;
                    weight.setAttribute('transform', 'translate(0 ' +
                            scaleY(delta_y)
                            + ')');
                    tempo = Math.round(maxTempo + tempoSteps *
                               (delta_y /
                            (dragStartY - dragEndY)));
                    tempoDisplay.firstChild.nodeValue = tempo;
                    tempoDescrDisplay.firstChild.nodeValue = tempoMarking(tempo);
                }
            }
        }
    });

    $(metronome).on('mousedown', function (e) {
        e.preventDefault(); // prevents text from being selected
        dragging = e.target;
    });

    $(metronome).on('mouseup', function (e) {
        // if the weight was dragged while animated
        // stop playing and start it over
        if (dragging === weight && isPlaying) {
            play();
            play();
        }
        dragging = null;
    });

    // starting / stoping the metronome
    $(startButton).on('click', function () {
        startButton.firstChild.nodeValue = play();
    });

    // tapping the tempo in
    $(tapButton).on('click', function (e) {
        var diff, stamp = new Date().getTime(),
            tappedTempo;
        prevTapStamp = prevTapStamp || stamp;

        diff = stamp - prevTapStamp;
        if (diff === 0) {
            return null;
        }
        tappedTempo = Math.round(1000 / diff * 60);
        if (tappedTempo >= 40 && tappedTempo <= 208) {
            tempoDisplay.firstChild.nodeValue = tappedTempo;
            tempoDescrDisplay.firstChild.nodeValue = tempoMarking(tappedTempo);
            weight.setAttribute('transform', 'translate(0 -' +
                    scaleY((maxTempo - tappedTempo) *
                     (dragStartY - dragEndY) /
                     tempoSteps)
                    + ')');
            // update the global tempo
            tempo = tappedTempo;
            if (isPlaying) {
                // stop
                play();
            }
        }
        prevTapStamp = stamp;
    });

    loadAudio();
    window.requestAnimFrame(draw);
});

// the why, how to and about toggling
$(document).ready(function () {
    "use strict";
    $('a').click(function () {
        var id = $(this).data().id;
        if (id.length > 0) {
            $('aside').not('#' + id).hide();
            $('#' + id).toggle();
        }
    });
});