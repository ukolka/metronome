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
    play = function () {
        isPlaying = !isPlaying;

        if (isPlaying) {

        } else {

        }
    },

    /**
     * End of metronome sound
     */


    /**
     * Web Audio
     */

    audioContext,
    metronomeClickBuffer,
    Sound = function (buffer, playAt) {
        var source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.noteOn(playAt);
        this.source = source;
        this.stop = function () {
            this.source.noteOff(0);
        };
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
            loadMetronomeSound("sound/54406__korgms2000b__metronome-click.wav");
        }
        catch (e) {
            alert('Web Audio API is not supported in this browser')
        }
    },
     /**
     * End of Web Audio
     */
        /*
    //Animation
    anim_int = null, // Animation interval
    animate = function () {
	var x = pendRotOrigin.x,
	y = pendRotOrigin.y,
	ang = 0,
	ang_lim = 10;
	between_clicks = 1000 / (tempo / 60); // ms in between clicks
	between_frames = 50;
	angle_incr = ang_lim * 2 / (between_clicks / between_frames);
	right = function () {
	    if (ang >= ang_lim) {
		metronomeClick.play();
		window.clearInterval(anim_int);
		anim_int = window.setInterval(left, between_frames);
	    }
	    ang += angle_incr;
	    move();
	};
	left = function () {
	    if (ang <= -ang_lim) {
		metronomeClick.play();
		window.clearInterval(anim_int);
		anim_int = window.setInterval(right, between_frames);
	    }
	    ang -= angle_incr;
	    move();
	};
	move = function () {
	    var rotate = 'rotate (' + ang + ' ' + x + ' ' + y + ')';
	    pendulumWithWeight.setAttribute('transform', rotate);
	};
	anim_int = window.setInterval(right, between_frames);
    },
    stop_animation = function () {
	var x = pendRotOrigin.x, y = pendRotOrigin.y,
	rotate = 'rotate(0 ' + x + ' ' + y + ')';
	window.clearInterval(anim_int);
	anim_int = null;
	pendulumWithWeight.setAttribute('transform', rotate);
    },*/

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
        // restart animation with new tempo
        if (dragging == weight && anim_int !== null) {
            stop_animation();
            animate();
        }
        dragging = null;
    });

    $(startButton).on('click', function (e) {
        new Sound(metronomeClickBuffer, 0);
    });

    $(tapButton).on('click', function (e) {
        var diff, stamp = new Date().getTime(),
            tappedTempo;
        prevTapStamp = prevTapStamp || stamp,

        diff = stamp - prevTapStamp;
        if (diff === 0) {
            return null;
        }
        tappedTampo = Math.round(1000 / diff * 60);
        if (tappedTampo >= 40 && tappedTampo <= 208) {
            tempoDisplay.firstChild.nodeValue = tappedTampo;
            tempoDescrDisplay.firstChild.nodeValue =
            tempoMarking(tappedTampo);
            weight.setAttribute('transform', 'translate(0 -' +
                    scaleY((maxTempo - tappedTampo) *
                     (dragStartY - dragEndY) /
                     tempoSteps)
                    + ')');
        }
        prevTapStamp = stamp;
    });

    loadAudio();
});