function particleField(backgroundColor){
    var canvas = document.getElementById("particles-js");
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;

    var ctx = canvas.getContext('2d');

    var mousePos = { x: 0, y: 0 };
    window.onmousemove = function(e) {
        mousePos.x = e.clientX;
        mousePos.y = e.clientY;
    };
    function distanceFromCenter() {
        return Math.sqrt(Math.pow(mousePos.x - (canvas.width / 2), 2) + Math.pow(mousePos.y - (canvas.height / 2), 2));
    }

    function Particle() {
        this.theta = Math.random() * Math.PI * 2;
        this.radius = (Math.random() * ((canvas.width > canvas.height) ? canvas.width : canvas.height) * 0.33) + 40;
        this.maxRadius = (Math.random() * ((canvas.width > canvas.height) ? canvas.width : canvas.height) * 0.45);
        this.radialChange = Math.random() * 0.1 *  (Math.random() > 0.5) ? 1 : -1;
        this.opacity = Math.random();
        this.size = Math.round(Math.random() * 6) + 4;
        this.speed = Math.round(Math.random() * 4) + 1;
        this.direction = (Math.random() > 0.5) ? 1 : -1;
        this.x = 0;
        this.y = 0;
        this.connected = (Math.random() < 0.75);
    }
    Particle.prototype.update = function() {
        this.theta += this.speed / 750 * this.direction;
        this.x = (canvas.width / 2) + (Math.cos(this.theta) * this.radius) * (distanceFromCenter() / this.maxRadius);
        this.y = (canvas.height / 2) + (Math.sin(this.theta) * this.radius) * (distanceFromCenter() / this.maxRadius);
        this.radius += this.radialChange;
        if (Math.abs(this.radius) > this.maxRadius) {
            this.radialChange *= -1;
        }
    };
    Particle.prototype.render = function() {
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#fff';
        ctx.globalAlpha = this.opacity;
        ctx.arc(this.x, this.y, this.size / 2, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    };

    var particles = [];
    for(var i = 0; i < (Math.random() * 50) + 100; i++) {
        particles.push(new Particle());
    }
    requestAnimationFrame(demo = function() {
        ctx.save();
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        particles.forEach(function(particle, i) {
            ctx.lineTo(particle.x, particle.y);
            particle.update();
            particle.render();
            if (particle.connected) {
                var p2 = particles[i + 1];
                if (p2) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.strokeStyle = '#fff';
                    ctx.globalAlpha = particle.opacity * 0.33;
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        });

        requestAnimationFrame(demo);
    });
}