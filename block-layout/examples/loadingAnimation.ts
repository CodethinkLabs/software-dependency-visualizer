var circle;
var continueAnimating : boolean;
var animationProgress : number;

function startLoadingAnimation()
{
    var svg = <HTMLElement> document.querySelector('svg');
    var svgNS = svg.namespaceURI;
    circle = document.createElementNS(svgNS,'circle');
    circle.setAttribute('cx','320');
    circle.setAttribute('cy','240');
    circle.setAttribute('r','16');
    circle.setAttribute('fill','#95B3D7');
    svg.appendChild(circle);
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
    if(continueAnimating) {
	setTimeout(function() {loadingAnimationTick();}, 40);
    }
}

function stopLoadingAnimation()
{
    continueAnimating = false;
}
