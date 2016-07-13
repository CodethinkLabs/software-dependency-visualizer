var circle;
var circle2;
var continueAnimating : boolean;
var animationProgress : number;

function makeCircle(document, svgNS)
{
    var circle = document.createElementNS(svgNS,'circle');
    circle.setAttribute('cx','320');
    circle.setAttribute('cy','240');
    circle.setAttribute('r','16');
    circle.setAttribute('fill','#95B3D7');
    return circle;
}

function startLoadingAnimation()
{
    var svg = <HTMLElement> document.querySelector('svg');
    circle = makeCircle(document, svg.namespaceURI);
    svg.appendChild(circle);
    circle2 = makeCircle(document, svg.namespaceURI);
    svg.appendChild(circle2);
    continueAnimating = true;
    animationProgress = 0;
    setTimeout(function() { loadingAnimationTick(); }, 40);
}

function loadingAnimationTick()
{
    animationProgress += 1;
    console.log("Loading animation");
    circle.setAttribute('cx', 320+64*Math.cos(animationProgress / 25 * Math.PI));
    circle.setAttribute('cy', 240+64*Math.sin(animationProgress / 25 * Math.PI));
    circle2.setAttribute('cx', 320-64*Math.cos(animationProgress / 25 * Math.PI));
    circle2.setAttribute('cy', 240-64*Math.sin(animationProgress / 25 * Math.PI));
    if(continueAnimating) {
	setTimeout(function() {loadingAnimationTick();}, 40);
    }
}

function stopLoadingAnimation()
{
    continueAnimating = false;
}
