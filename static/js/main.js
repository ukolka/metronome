// Load flattr
(function() {
    var s = document.createElement('script');
    var t = document.getElementsByTagName('script')[0];

    s.type = 'text/javascript';
    s.async = true;
    s.src = '//api.flattr.com/js/0.6/load.js?mode=auto';

    t.parentNode.insertBefore(s, t);
})();


"use strict";

// requestAnimFrame shim
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function( callback ){
            window.setTimeout(callback, 1000 / 60);
        };
})();

$(window).load( function () {
    var container = document.querySelector('#metronome'),
    containerHeight = $(container).height(),
    metronome = container.getSVGDocument(), // or .contentDocument
    svgHeight =$(metronome.rootElement).attr('height'),
    pendulum = metronome.getElementById('rect6537'),
    pendulumX = parseInt($(pendulum).attr('x')),
    pendulumY = parseInt($(pendulum).attr('y')),
    pendulumWidth = parseInt($(pendulum).attr('width')),
    pendulumHeight = parseInt($(pendulum).attr('height')),
    weight = metronome.getElementById('path6544'),
    pendulumWithWeight = metronome.getElementById('g3203'),
    metronomeClick = null,

    // useful
    pendRotOrigin = {x: pendulumX + pendulumWidth / 2,
		       y: pendulumY + pendulumHeight},


    // controls
    tempoDisplay = metronome.getElementById('tspan3928'),
    tempoDescrDisplay = metronome.getElementById('tspan7508-2-8-0-1-0-8-7-6'),
    startButton = metronome.getElementById('tspan3172'),
    tapButton = metronome.getElementById('tspan3176'),

    /**
    * According to http://en.wikipedia.org/wiki/Tempo#Basic_tempo_markings
    */
    tempoMarking = function (tempo) {
        if (tempo <= 19) {
            return 'Larghissimo';
        }
        else if (tempo < 40) {
            return 'Grave';
        }
        else if (tempo < 45) {
            return 'Lento';
        }
        else if (tempo < 50) {
            return 'Largo';
        }
        else if (tempo < 55) {
            return 'Larghetto';
        }
        else if (tempo < 65) {
            return 'Adagio';
        }
        else if (tempo < 69) {
            return 'Adagietto';
        }
        else if (tempo < 72) {
            return 'Andante moderato';
        }
        else if (tempo < 77) {
            return 'Andante';
        }
        else if (tempo < 83) {
            return 'Andantino';
        }
        else if (tempo < 85) {
            return 'Marcia moderato';
        }
        else if (tempo < 97) {
            return 'Moderato';
        }
        else if (tempo < 109) {
            return 'Allegretto';
        }
        else if (tempo < 132) {
            return 'Allegro';
        }
        else if (tempo < 140) {
            return 'Vivace';
        }
        else if (tempo < 150) {
            return 'Vivacissimo';
        }
        else if (tempo < 167) {
            return 'Allegrissimo';
        }
        else if (tempo < 177) {
            return 'Presto';
        }
        else if (tempo > 177) {
            return 'Prestissimo';
        }
    },

    // returns y coordinate scaled in terms of original svg height
    scaleY = function (y) {
	    return y / containerHeight * svgHeight;
    },

    /**
     * Metronome sound
     */
    isPlaying = false,
    lookahead = 5, // lookahead in beats
    beatsBuffer = [],
    startTime,
    secondsBetweenBeats,
    rescheduleTimer,
    play = function () {
        isPlaying = !isPlaying;

        if (isPlaying) {
            schedule();
            return 'Stop';
        } else {
            unSchedule();
            return 'Start';
        }
    },
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
    unSchedule = function () {
        var i;
        for (i = 0; i < lookahead; i += 1) {
            beatsBuffer.pop().stop();
        }
        clearInterval(rescheduleTimer);
    },

    /**
     * End of metronome sound
     */

    /**
     * Animation
     */
    frames = 0,
    draw = function () {
        var currentTime, angle, rotate, timeDiff, beatNumber;
        if (isPlaying && frames % 5 == 0) {
            currentTime = audioContext.currentTime;
            timeDiff = currentTime - startTime;
            angle = (Math.round(((timeDiff / secondsBetweenBeats) % 1) * 10) - 5) * 2;
            beatNumber = Math.floor(timeDiff / secondsBetweenBeats);
            if (beatNumber % 2 == 0) {
                angle = -angle;
            }
            if (tempo > 80) {
                angle = 10 - angle < 6 ? 10 : angle;
                angle = -10 - angle > -6 ? -10 : angle;
            }
            angle -= 1;
            rotate = 'rotate (' + angle + ' ' + pendRotOrigin.x + ' ' + pendRotOrigin.y + ')';
            pendulumWithWeight.setAttribute('transform', rotate);
        }
        frames += 1;
        requestAnimFrame(draw);
    },
    /**
     * end of Animation
     */

    /**
     * Web Audio
     */

    audioContext,
    metronomeClickBuffer,
    metronomeVolume = document.querySelector('#volume'),
    Sound = function (buffer, playAt) {
        var source = audioContext.createBufferSource();
        source.buffer = buffer;
        source = routeSound(source);
        //source.connect(audioContext.destination);
        source.noteOn(playAt);
        this.source = source;
        this.stop = function () {
            this.source.noteOff(0);
        };
        this.playAt = playAt;
    },
    routeSound = function (source) {
        var volume = metronomeVolume.value,
            gainNode = audioContext.createGainNode();
        gainNode.gain.value = volume / 15;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        return source;
    },
    loadMetronomeSound = function (url) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        // Decode asynchronously
        request.onload = function () {
            audioContext.decodeAudioData(request.response, function(buffer) {
                metronomeClickBuffer = buffer;
            });
        }
        request.send();
    },
    loadAudio = function () {
        try {
            audioContext = new webkitAudioContext();
        }
        catch (e) {
            console.log('Web Audio API is not supported in this browser');
        }
        loadMetronomeSound("sound/54406__korgms2000b__metronome-click.wav");
    },
     /**
     * End of Web Audio
     */

    maxTempo = 208,
    tempoSteps = 168, // from 40 to 208

    
    // Dragging of the weight.
    dragging = null,
    dragStartY = containerHeight * 0.67243,
    dragEndY = containerHeight * 0.065,
    // Global current tempo
    tempo = maxTempo,

    // Previous tap timestamp
    prevTapStamp = null;

    // Set cursors
    weight.setAttribute('cursor', 'move');
    startButton.setAttribute('cursor', 'pointer');
    tapButton.setAttribute('cursor', 'pointer');


    $(metronome).on('mousemove', function (e) {
        var delta_y;
        if (dragging !== null) {
            // dragging weight
            if (dragging == weight) {
            if (e.pageY > dragEndY && e.pageY < dragStartY) {
                delta_y = e.pageY - dragStartY;
                weight.setAttribute('transform', 'translate(0 ' +
                        scaleY(delta_y)
                        + ')');
                tempo = Math.round(maxTempo + tempoSteps *
                           (delta_y /
                        (dragStartY - dragEndY)));
                tempoDisplay.firstChild.nodeValue = tempo;
                tempoDescrDisplay.firstChild.nodeValue =
                tempoMarking(tempo);
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
        if (dragging == weight && isPlaying) {
            play();
            play();
        }
        dragging = null;
    });

    $(startButton).on('click', function (e) {
        startButton.firstChild.nodeValue = play();
    });

    $(tapButton).on('click', function (e) {
        var diff, stamp = new Date().getTime(),
            tappedTempo;
        prevTapStamp = prevTapStamp || stamp,

        diff = stamp - prevTapStamp;
        if (diff === 0) {
            return null;
        }
        tappedTempo = Math.round(1000 / diff * 60);
        if (tappedTempo >= 40 && tappedTempo <= 208) {
            tempoDisplay.firstChild.nodeValue = tappedTempo;
            tempoDescrDisplay.firstChild.nodeValue =
            tempoMarking(tappedTempo);
            weight.setAttribute('transform', 'translate(0 -' +
                    scaleY((maxTempo - tappedTempo) *
                     (dragStartY - dragEndY) /
                     tempoSteps)
                    + ')');
            tempo = tappedTempo;
            if (isPlaying) {
                // stop
                play();
            }
        }
        prevTapStamp = stamp;
    });

    loadAudio();
    requestAnimFrame(draw);
});

$(document).ready(function () {
    $('a').click(function () {
        var id = $(this).data().id;
        if (id.length > 0) {
            $('aside').not('#' + id).hide();
            $('#' + id).toggle();
        }
    });
});