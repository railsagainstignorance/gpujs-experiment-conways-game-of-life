const GOL = (function(){

  function create( config ){
    const gpu = config.gpu;

    const initGrid = gpu.createKernel(function() {
        return (6 * (this.thread.x % 5)) + (4 * (this.thread.y % 10));
    }).setOutput([config.sizeX, config.sizeY])

    const render = gpu.createKernel(function(a) {
        this.color(a[this.thread.x], a[this.thread.y], 200, 1);
    })
      .setOutput([config.sizeX, config.sizeY])
      .setGraphical(true);

    // const initAndRender = gpu.combineKernels(initGrid, render, function() {
	  //    return render(initGrid());
    //  });
    //
    // initAndRender();

    const grid = initGrid();
    render(grid);

    const canvas = render.getCanvas();
    config.displayCanvas( canvas );
  }

return {
  create
}
})();
