const GOL = (function(){

  function create( config ){
    const gpu = config.gpu;

    const initGrid = gpu.createKernel(function(offset) {
        return (6 * ((this.thread.x + offset) % 5)) + (4 * ((this.thread.y + offset) % 10));
    }).setOutput([config.sizeX, config.sizeY])

    const render = gpu.createKernel(function(a) {
        // this.color( 0-1, 0-1, 0-1, 1)
        this.color(
          (a[this.thread.x][this.thread.y] % 100)/100,
          (a[this.thread.x][this.thread.y] % 100)/100,
          0.1,
          1
        );
    })
      .setOutput([config.sizeX, config.sizeY])
      .setGraphical(true);

    const initAndRender = gpu.combineKernels(initGrid, render, function(offset) {
	     return render(initGrid(offset));
     });

    var offset=5;
    const maxOffset = 200;
    function animateOffsets(){
       initAndRender(offset);
       const canvas = render.getCanvas();
       const prevCanvas = config.canvasDivElement.firstChild;
       if(prevCanvas == null){
         config.canvasDivElement.appendChild(canvas);
       } else {
         config.canvasDivElement.replaceChild(canvas, prevCanvas);
       }
       if (offset < maxOffset) {
         offset += 1;
         window.requestAnimationFrame(animateOffsets);
         // window.setTimeout(function(){
         //   window.requestAnimationFrame(animateOffsets);
         // }, 1000);
       }
     }
     window.requestAnimationFrame(animateOffsets);

    // const grid = initGrid();
    // render(grid);

    // const canvas = render.getCanvas();
    // config.displayCanvas( canvas );
  }

return {
  create
}
})();
