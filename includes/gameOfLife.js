const GOL = (function(){

  function create( config ){
    const gpu = config.gpu;

    const render = gpu.createKernel(function() {
        this.color(50 * (this.thread.x % 3), 50 * (this.thread.y % 4), 50, 1);
    })
      .setOutput([config.sizeX, config.sizeY])
      .setGraphical(true);

    render();
    const canvas = render.getCanvas();
    config.displayCanvas( canvas );
  }

return {
  create
}
})();
