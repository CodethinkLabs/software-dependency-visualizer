
var $;
$.get('/packagelist', function (package_info) {
    console.log("Retrieved package log");
    console.log(package_info);
    var list = document.getElementById('packageList');
    var packages: string[] = package_info.split(",");
    packages.forEach(function(p) {
	var listItem = document.createElement('li');
	var link = document.createElement('a');
	link.appendChild(document.createTextNode(p));
	link.href="showpackage.html?package="+p;
	listItem.appendChild(link);
	list.appendChild(listItem);
    });
});



