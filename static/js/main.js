$(window).load( function () {
    var container = document.querySelector('#metronome'),
    container_height = $(container).height(),
    metronome = container.getSVGDocument(), // or .contentDocument
    svg_height =$(metronome.rootElement).attr('height'),
    pendulum = metronome.getElementById('rect6537'),
    pendulum_x = parseInt($(pendulum).attr('x')),
    pendulum_y = parseInt($(pendulum).attr('y')),
    pendulum_width = parseInt($(pendulum).attr('width')),
    pendulum_height = parseInt($(pendulum).attr('height')),
    weight = metronome.getElementById('path6544'),
    pendulum_with_weight = metronome.getElementById('g3203'),
    metronome_click = null,

    // useful
    pend_rot_origin = {x: pendulum_x + pendulum_width / 2,
		       y: pendulum_y + pendulum_height},


    // controls
    tempo_display = metronome.getElementById('tspan3928'),
    tempo_descr_display = metronome.getElementById('tspan7508-2-8-0-1-0-8-7-6'),
    start_button = metronome.getElementById('tspan3172'),
    tap_button = metronome.getElementById('tspan3176'),

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
    scale_y = function (y) {
	return y / container_height * svg_height;
    },

    //Animation
    anim_int = null, // Animation interval
    animate = function () {
	var x = pend_rot_origin.x,
	y = pend_rot_origin.y,
	ang = 0,
	ang_lim = 10;
	between_clicks = 1000 / (tempo / 60); // ms in between clicks
	between_frames = 50;
	angle_incr = ang_lim * 2 / (between_clicks / between_frames);
	right = function () {
	    if (ang >= ang_lim) {
		metronome_click.play();
		window.clearInterval(anim_int);
		anim_int = window.setInterval(left, between_frames);
	    }
	    ang += angle_incr;
	    move();
	};
	left = function () {
	    if (ang <= -ang_lim) {
		metronome_click.play();
		window.clearInterval(anim_int);
		anim_int = window.setInterval(right, between_frames);
	    }
	    ang -= angle_incr;
	    move();
	};
	move = function () {
	    var rotate = 'rotate (' + ang + ' ' + x + ' ' + y + ')';
	    pendulum_with_weight.setAttribute('transform', rotate);
	};
	anim_int = window.setInterval(right, between_frames);
    },
    stop_animation = function () {
	var x = pend_rot_origin.x, y = pend_rot_origin.y,
	rotate = 'rotate(0 ' + x + ' ' + y + ')';
	window.clearInterval(anim_int);
	anim_int = null;
	pendulum_with_weight.setAttribute('transform', rotate);
    },

    max_tempo = 208,
    tempo_steps = 168, // from 40 to 208

    
    // Dragging of the weight.
    dragging = null,
    drag_start_y = container_height * 0.67243,
    drag_end_y = container_height * 0.065,
    // Global current tempo
    tempo = max_tempo,

    // Previous tap timestamp
    prev_tap_stamp = null;

    // Set cursors
    weight.setAttribute('cursor', 'move');
    start_button.setAttribute('cursor', 'pointer');
    tap_button.setAttribute('cursor', 'pointer');


    soundManager.setup({
	url: 'js/vendor/soundmanagerv297a-20130101/swf',
	onready: function() {
	    metronome_click = soundManager.createSound({
		id: 'click',
		url: 'sound/54406__korgms2000b__metronome-click.mp3',
		volume: 300
	    });
	},
	ontimeout: function() {
	    // Hrmm, SM2 could not start. Missing SWF? Flash blocked? Show an error, etc.?
	}
    });


    $(metronome).on('mousemove', function (e) {
	var delta_y;
	if (dragging !== null) {
	    // dragging weight
	    if (dragging == weight) {
		if (e.pageY > drag_end_y && e.pageY < drag_start_y) { 
		    delta_y = e.pageY - drag_start_y;
		    weight.setAttribute('transform', 'translate(0 ' +
					scale_y(delta_y) 
					+ ')');
		    tempo = Math.round(max_tempo + tempo_steps *
				       (delta_y /
					(drag_start_y - drag_end_y)));
		    tempo_display.firstChild.nodeValue = tempo;
		    tempo_descr_display.firstChild.nodeValue =
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

    $(start_button).on('click', function (e) {
	if (anim_int === null) {
	    animate();
	    start_button.firstChild.nodeValue = 'Stop';
	} else {
	    stop_animation();
	    start_button.firstChild.nodeValue = 'Start';
	}
    });

    $(tap_button).on('click', function (e) {
	var diff, stamp = new Date().getTime();
	prev_tap_stamp = prev_tap_stamp || stamp;

	diff = stamp - prev_tap_stamp;
	if (diff === 0) {
	    return null;
	}
	tapped_tampo = Math.round(1000 / diff * 60);
	if (tapped_tampo >= 40 && tapped_tampo <= 208) {
	    tempo_display.firstChild.nodeValue = tapped_tampo;
	    tempo_descr_display.firstChild.nodeValue = 
		tempoMarking(tapped_tampo);
	    weight.setAttribute('transform', 'translate(0 -' +
				scale_y((max_tempo - tapped_tampo) *
				 (drag_start_y - drag_end_y) /
				 tempo_steps)
				+ ')');
	}
	prev_tap_stamp = stamp;
    });
});