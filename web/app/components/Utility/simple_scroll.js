export default function (thumbtrack,simple_slider){

      
    let simple_scroll_line = thumbtrack.parentNode;
    let inside_content = simple_slider.getElementsByTagName('div')[0];

    if(!inside_content.getElementsByTagName('div').length){
        return false;
    }

    let coordX;
    let coords;
    let shiftX;
    let gir;   
    let slides = inside_content.childNodes;  

    inside_content.style.width = slides[0].offsetWidth  * slides.length + 'px';


    function getCoords(elem) {
        let box = elem.getBoundingClientRect();
        return {
            left: box.left + pageXOffset
        };
    };

    function moveAt(e) {        
        let procent = Math.round((e.pageX - coordX.left - shiftX) / (simple_scroll_line.offsetWidth - thumbtrack.offsetWidth) * 100);

        if (e.pageX - coordX.left - shiftX < 0) {
            thumbtrack.style.left = '0px';
        } else if (e.pageX - coordX.left - shiftX + thumbtrack.offsetWidth > simple_scroll_line.offsetWidth) {
            thumbtrack.style.left = (simple_scroll_line.offsetWidth - thumbtrack.offsetWidth) + 'px';
        } else {
            thumbtrack.style.left = e.pageX - coordX.left - shiftX + 'px';
        }
        if (procent < 0) {
            inside_content.style.transform = 'translateX(0px)';
        } else if (procent > 100) {
            inside_content.style.transform = `translateX(${-(inside_content.offsetWidth-simple_slider.offsetWidth)}px)`;
        } else {
            inside_content.style.transform = `translateX(${Math.round(-(inside_content.offsetWidth-simple_slider.offsetWidth)*procent/100)}px)`;
        };
    };

    thumbtrack.onmousedown = function(e) {
        coordX = getCoords(simple_scroll_line);
        coords = getCoords(thumbtrack);
        shiftX = e.pageX - coords.left;
        moveAt(e);

        document.onmousemove = function(e) {
            moveAt(e);
        };

        document.onmouseup = function() {
            document.onmousemove = null;
            thumbtrack.onmouseup = null;
        };
    };
}