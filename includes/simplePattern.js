const SIMPLEPATTERN = (function(){

  function create( config ){
    const gpu = config.gpu;

    const initGrid = gpu.createKernel(function(offset) {
        return (6 * ((this.thread.x + offset) % 20)) + (4 * ((this.thread.y + offset) % 21));
    }).setOutput([config.sizeX, config.sizeY])

    const render = gpu.createKernel(function(a) {
        // this.color( 0-1, 0-1, 0-1, 1)
        this.color(
          (a[this.thread.x][this.thread.y] % 100)/100,
          (a[this.thread.x][this.thread.y] % 100)/100,
          (((this.thread.x+this.thread.y)/3) % 100)/100,
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
       if (offset < maxOffset) {
         offset += 1;
         window.requestAnimationFrame(animateOffsets);
       }
     }
     window.requestAnimationFrame(animateOffsets);
  }

return {
  create
}
})();
