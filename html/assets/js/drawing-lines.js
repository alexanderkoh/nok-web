// Copyright Dan Gries http://rectangleworld.com/blog/

function drawingLines() {

    $("#displayCanvas").attr( "width", $(window).width() );
    $("#displayCanvas").attr( "height", $(window).height() );

    var displayCanvas = document.getElementById("displayCanvas");
    var context = displayCanvas.getContext("2d");
    var displayWidth = displayCanvas.width;
    var displayHeight = displayCanvas.height;

    var numBoids = 300;
    var minActDist = 0.22;
    var maxRepelDist = minActDist*0.5;
    var boundaryRepelDist = 0.15;
    var cohFactor = 0.0001;
    var sepFactor = 0.000065;
    var aliFactor = 0.027;
    var boidRad1 = 0.5;
    var boidRad2 = 1.25;
    var boidRad3 = 2.5;
    var boidRad4 = 5;
    var maxSpeed = 0.02;
    var minSpeed = 0.007;
    var maxForce = 1;
    var boundaryMaxForce = 0.001;


    var vMax = 0.9;
    var wMax = 1.1;
    var xMax = 1.3;
    var yMax = 1;
    var zMax = displayHeight/displayWidth*yMax;

    var coordMaxArray = [vMax, wMax, xMax, yMax, zMax];
    var coordMax;
    var allCenterX;
    var allCenterY;
    var findCenter;
    var flock; //linked list
    var running;
    var drawBoids;

    var maxRepelDistSquare = maxRepelDist*maxRepelDist;

    var maxActionDistSquare = minActDist*minActDist;
    var bgColor = "#ffffff";
    var fadeColor = "rgba(0,0,0,0.15)";
    document.body.style.backgroundColor = bgColor;

    var urlColor = "#999999";

    (function() {
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
                || window[vendors[x]+'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame)
            window.requestAnimationFrame = function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                    timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };

        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
    }());

    /////////////////////////////////
    init();

    function init() {
        flock = createFlock();
        drawBoids = drawBoidsLine;
        boidRad = boidRad1;
        findCenter = false;
        startAnimation();
    }

    function onTimer() {
        updateBoids();
        drawBoids();
    }


    function btnStopGoHandler(evt) {
        if (running) {
            btnStopGo.value = "go";
            running = false;
            stopAnimation();
        }
        else {
            btnStopGo.value = "stop";
            running = true;
            startAnimation();
        }
    }

    function updateBoids() {
        var b = flock.first;
        var b2;
        var coords = ["v","w","x","y","z"];
        var coord;
        var coordsLen = coords.length;
        var i;
        var sep;
        var coh;
        var ali;
        var distSquare;
        var dv;
        var dw;
        var dx;
        var dy;
        var dz;
        var perceivedCenter;
        var neighborCount;
        var mag;
        var magSquare;
        var magSquareRecip;
        var diff;
        var speedFactor;
        var accel;
        var accelFactor;
        var factor;

        //first pass: calculate velocities
        while (b != null) {
            perceivedCenter = {v:0,w:0,x:0,y:0,z:0};
            perceivedVelocity = {v:0,w:0,x:0,y:0,z:0};
            coh = {v:0,w:0,x:0,y:0,z:0};
            sep = {v:0,w:0,x:0,y:0,z:0};
            ali = {v:0,w:0,x:0,y:0,z:0};
            accel = {v:0,w:0,x:0,y:0,z:0};
            diff = {};
            neighborCount = 0;
            b2 = flock.first;
            while (b2 != null) {
                //contribution of this neighbor to perceived center, for cohesion vector,
                //plus contribution to average velocity, for alignment vector.
                dv = b2.v - b.v;
                dw = b2.w - b.w;
                dx = b2.x - b.x;
                dy = b2.y - b.y;
                dz = b2.z - b.z;
                distSquare = dv*dv + dw*dw + dx*dx + dy*dy + dz*dz;
                if ((b2 !== b) && (distSquare < maxActionDistSquare)) {
                    perceivedCenter.v += b2.v;
                    perceivedCenter.w += b2.w;
                    perceivedCenter.x += b2.x;
                    perceivedCenter.y += b2.y;
                    perceivedCenter.z += b2.z;

                    perceivedVelocity.v += b2.vv;
                    perceivedVelocity.w += b2.vw;
                    perceivedVelocity.x += b2.vx;
                    perceivedVelocity.y += b2.vy;
                    perceivedVelocity.z += b2.vz;

                    neighborCount++;
                }

                //contribution of this neighbor to separation vector
                if ((b2 !== b) && (distSquare>0) && (distSquare < maxRepelDistSquare)) {
                    diff.v = b.v - b2.v;
                    diff.w = b.w - b2.w;
                    diff.x = b.x - b2.x;
                    diff.y = b.y - b2.y;
                    diff.z = b.z - b2.z;

                    //normalize
                    magSquareRecip = 1/(diff.v*diff.v+diff.w*diff.w+diff.x*diff.x+diff.y*diff.y+diff.z*diff.z);

                    //change magnitude, inv. prop. to dist., and add this to the accumulated separation vector
                    sep.v += diff.v*magSquareRecip;
                    sep.w += diff.w*magSquareRecip;
                    sep.x += diff.x*magSquareRecip;
                    sep.y += diff.y*magSquareRecip;
                    sep.z += diff.z*magSquareRecip;
                }

                b2 = b2.next;
            }

            //cohesion and alignment vector calculations
            if (neighborCount != 0) {

                //cohesion vector
                //optimizing by dividing by neighborcount and subtracting at same time
                coh.v = perceivedCenter.v/neighborCount - b.v;
                coh.w = perceivedCenter.w/neighborCount - b.w;
                coh.x = perceivedCenter.x/neighborCount - b.x;
                coh.y = perceivedCenter.y/neighborCount - b.y;
                coh.z = perceivedCenter.z/neighborCount - b.z;

                //normalize cohesion vector
                mag = Math.sqrt(coh.v*coh.v+coh.w*coh.w+coh.x*coh.x+coh.y*coh.y+coh.z*coh.z);
                if (mag != 0) {
                    coh.v *= factor = cohFactor/mag;
                    coh.w *= factor;
                    coh.x *= factor;
                    coh.y *= factor;
                    coh.z *= factor;
                }

                //alignment vector
                ali.v = perceivedVelocity.v/neighborCount - b.vv;
                ali.w = perceivedVelocity.w/neighborCount - b.vw;
                ali.x = perceivedVelocity.x/neighborCount - b.vx;
                ali.y = perceivedVelocity.y/neighborCount - b.vy;
                ali.z = perceivedVelocity.z/neighborCount - b.vz;
            }

            //boundary push
            boundaryForce = {v:0,w:0,x:0,y:0,z:0};
            for (i = 0; i < coordsLen; i++) {
                coord = coords[i];
                if (b[coord] < boundaryRepelDist) {
                    boundaryForce[coord] = boundaryMaxForce*(1-b[coord]/boundaryRepelDist);
                }
                else if (b[coord] > (coordMax = coordMaxArray[i]) - boundaryRepelDist) {
                    boundaryForce[coord] = -boundaryMaxForce*(1+(b[coord]-coordMax)/boundaryRepelDist);
                }
            }

            //set accel - cohesion factor already used above
            accel.v = coh.v + sepFactor*sep.v + aliFactor*ali.v + boundaryForce.v;
            accel.w = coh.w + sepFactor*sep.w + aliFactor*ali.w + boundaryForce.w;
            accel.x = coh.x + sepFactor*sep.x + aliFactor*ali.x + boundaryForce.x;
            accel.y = coh.y + sepFactor*sep.y + aliFactor*ali.y + boundaryForce.y;
            accel.z = coh.z + sepFactor*sep.z + aliFactor*ali.z + boundaryForce.z;

            //clamp accel
            mag = Math.sqrt(accel.v*accel.v+accel.w*accel.w+accel.x*accel.x+accel.y*accel.y+accel.z*accel.z);
            if (mag > maxForce) {
                accelFactor = maxForce/mag;
                accel.v *= accelFactor;
                accel.w *= accelFactor;
                accel.x *= accelFactor;
                accel.y *= accelFactor;
                accel.z *= accelFactor;
            }

            //update velocity
            b.vv += accel.v;
            b.vw += accel.w;
            b.vx += accel.x;
            b.vy += accel.y;
            b.vz += accel.z;

            //limit speed between min and max
            mag = Math.sqrt(b.vv*b.vv + b.vw*b.vw + b.vx*b.vx + b.vy*b.vy + b.vz*b.vz);
            if (mag > maxSpeed) {
                speedFactor = maxSpeed/mag;
                b.vv *= speedFactor;
                b.vw *= speedFactor;
                b.vx *= speedFactor;
                b.vy *= speedFactor;
                b.vz *= speedFactor;
            }
            else if ((mag > 0) && (mag < minSpeed)) {
                speedFactor = minSpeed/mag;
                b.vv *= speedFactor;
                b.vw *= speedFactor;
                b.vx *= speedFactor;
                b.vy *= speedFactor;
                b.vz *= speedFactor;
            }

            b = b.next;
        }

        //second pass: update positions
        b = flock.first;
        allCenterY = 0;
        allCenterZ = 0;
        while (b != null) {

            //record last positions
            for (i = 0; i < coordsLen; i++) {
                coord = coords[i];
                b[coord+"Last"] = b[coord];
            }

            //update position
            b.v += b.vv;
            b.w += b.vw;
            b.x += b.vx;
            b.y += b.vy;
            b.z += b.vz;

            if (findCenter) {
                allCenterY += b.y;
                allCenterZ += b.z;
            }

            //clamping - wall bounce
            for (i = 0; i < coordsLen; i++) {
                coord = coords[i];
                if (b[coord] < 0) {
                    b[coord] = 0;
                    b["v"+coord] *= -1;
                }
                else if (b[coord] > (coordMax = coordMaxArray[i])) {
                    b[coord] = coordMax;
                    b["v"+coord] *= -1;
                }
            }

            b = b.next;
        }

        if (findCenter) {
            allCenterY /= numBoids;
            allCenterZ /= numBoids;
        }
    }

    function drawBoidsLine() {
        //context.globalAlpha = 0.04;
        var b = flock.first;
        var pixX;
        var pixY;
        var lastPixX;
        var lastPixY;
        var xPixRate = (displayWidth-2*boidRad4)/yMax;
        var yPixRate = (displayHeight-2*boidRad4)/zMax;
        var rRate = 255/vMax;
        var gRate = 255/wMax;
        var bRate = 255/xMax;
        context.lineWidth = boidRad+boidRad;
        context.lineCap="butt";
        while (b != null) {
            context.strokeStyle = "rgb(" + (~~(b.v*rRate)) +"," + (~~(b.w*gRate)) + "," + (~~(b.x*bRate)) +")";
            pixX = boidRad4 + xPixRate*b.y;
            pixY = boidRad4 + yPixRate*b.z;
            lastPixX = boidRad4 + xPixRate*b.yLast;
            lastPixY = boidRad4 + yPixRate*b.zLast;

            context.beginPath();
            context.moveTo(lastPixX,lastPixY);
            context.lineTo(pixX,pixY);
            context.stroke();
            b = b.next;
        }

        drawBoidsDot();
        //context.globalAlpha = 1;
    }

    function drawBoidsDot() {
        var b = flock.first;
        var pixX;
        var pixY;
        var xPixRate = (displayWidth-2*boidRad4)/yMax;
        var yPixRate = (displayHeight-2*boidRad4)/zMax;
        var rRate = 255/vMax;
        var gRate = 255/wMax;
        var bRate = 255/xMax;
        while (b != null) {
            context.fillStyle = "rgb(" + (~~(b.v*rRate)) +"," + (~~(b.w*gRate)) + "," + (~~(b.x*bRate)) +")";
            pixX = boidRad4 + xPixRate*b.y;
            pixY = boidRad4 + yPixRate*b.z;
            context.beginPath();
            context.arc(pixX,pixY,boidRad,0,Math.PI*2,false);
            context.fill();
            b = b.next;
        }
    }

    function drawBoidsCircle() {
        context.globalAlpha = 0.5;
        var b = flock.first;
        var pixX;
        var pixY;
        var xPixRate = (displayWidth-2*boidRad4)/yMax;
        var yPixRate = (displayHeight-2*boidRad4)/zMax;
        var rRate = 255/vMax;
        var gRate = 255/wMax;
        var bRate = 255/xMax;
        while (b != null) {
            context.strokeStyle = "rgb(" + (~~(b.v*rRate)) +"," + (~~(b.w*gRate)) + "," + (~~(b.x*bRate)) +")";
            pixX = boidRad4 + xPixRate*b.y;
            pixY = boidRad4 + yPixRate*b.z;
            context.beginPath();
            context.arc(pixX,pixY,boidRad,0,Math.PI*2,false);
            context.stroke();
            b = b.next;
        }
        context.globalAlpha = 1;
    }

    function startAnimation() {
        running = true;
        (function animloop(){
            request = requestAnimationFrame(animloop);
            onTimer();
        })();
    }

    function stopAnimation() {
        running = false;
        cancelAnimationFrame(request);
    }


    function createFlock() {
        var newFlock = {};
        var i;
        var newBoid;
        var lastBoid = newFlock.first = createBoid();
        for (i = 0; i < numBoids; i++) {
            lastBoid = lastBoid.next = createBoid();
        }
        return newFlock;
    }

    function createBoid() {
        var newBoid = {};
        var coords = ["v","w","x","y","z"];
        var coord;
        var i;
        var len = coords.length;
        for (i = 0; i < len; i++) {
            coord=coords[i]
            newBoid[coord] = 0.1+ Math.random()*(coordMaxArray[i] - 0.2);
            newBoid[coord+"Last"] = newBoid[coords];
            newBoid["v"+coord] = 0.25*maxSpeed*(Math.random()*2 - 1)
        }

        return newBoid;
    }

}