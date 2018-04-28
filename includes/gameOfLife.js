const GOL = (function(){

  function create( config ){
    const gpu = config.gpu;

    const render = gpu.createKernel(function() {
        this.color(50, 0, 50, 1);
    })
      .setOutput([20, 20])
      .setGraphical(true);

    render();

    const canvas = render.getCanvas();
    canvas.id = config.canvasId;
    document.getElementById(config.canvasDivId).appendChild(canvas);
  }

return {
  create
}
})();
