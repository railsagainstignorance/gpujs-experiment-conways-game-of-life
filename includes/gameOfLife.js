const GOL = (function(){

  function create( config ){
    const gpu = config.gpu;

    function initRandomArray(maxX,maxY){
      const a = [];
      for (var y = 0; y < maxY; y++) {
        a.push([]);
        for (var x = 0; x < maxX; x++) {
          const cell = (Math.random()>0.5)? 1 : 0;
          a[y].push(cell);
        }
      }
      return a;
    }

    // console.log(`initRandomArray: ${JSON.stringify(initRandomArray(10,10), null, 2)}`);

    const loadGridKFn = function(a) {
        return a[this.thread.x][this.thread.y];
    }

    const loadGridK = gpu.createKernel(loadGridKFn).setOutput([config.sizeX, config.sizeY])

    const tickKFn = function(grid) {
      var sum = 0;
      for (var dx = -1; dx < 2; dx++) {
        for (var dy = -1; dy < 2; dy++) {
          const nhrX = this.thread.x + dx;
          const nhrY = this.thread.y + dy;
          if (nhrX<0) { nhrX = this.constants.sizeX -1; } else if (nhrX >= this.constants.sizeX) { nhrX = 0; }
          if (nhrY<0) { nhrY = this.constants.sizeY -1; } else if (nhrY >= this.constants.sizeY) { nhrY = 0; }
          sum = sum + grid[nhrX][nhrY];
        }
      }
      var outputCell;
      if( (sum == 3) || ((sum == 2) && (grid[this.thread.x][this.thread.y] == 1) ) ) {
        outputCell = 1;
      } else {
        outputCell = 0;
      }
      return outputCell;
    }

    const tickK = gpu.createKernel(tickKFn, {
      constants: {
        sizeX: config.sizeX,
        sizeY: config.sizeY,
      },
      output: [config.sizeX, config.sizeY]
    });

    const renderKFn = function(grid) {
        // this.color( 0-1, 0-1, 0-1, 1)
        this.color(
          grid[this.thread.x][this.thread.y] * 100,
          grid[this.thread.x][this.thread.y] * 100,
          grid[this.thread.x][this.thread.y] * 100,
          1
        );
    };

      const renderK = gpu.createKernel(renderKFn)
        .setOutput([config.sizeX, config.sizeY])
        .setGraphical(true);

      const initAndRenderK = gpu.combineKernels(loadGridK, tickK, renderK, function(a) {
  	     return renderK(tickK(loadGridK(a)));
      });

    const randomArray = initRandomArray(config.sizeX, config.sizeY);
    initAndRenderK( randomArray );
    // const loadGridOutput = loadGrid(randomArray);
    // console.log(`loadGridOutput: ${JSON.stringify(loadGridOutput, null, 2)}`);
    // const tickOutput = tick( randomArray );
    // console.log(`tickOutput: ${JSON.stringify(tickOutput, null, 2)}`);
    // const renderOutput = render( randomArray );
    // console.log(`renderOutput: ${JSON.stringify(renderOutput, null, 2)}`);

    // var offset=5;
    // const maxOffset = 200;
    // function animateOffsets(){
    //    initAndRender(offset);
    //    if (offset < maxOffset) {
    //      offset += 1;
    //      window.requestAnimationFrame(animateOffsets);
    //    }
    //  }
    //  window.requestAnimationFrame(animateOffsets);
  }

return {
  create
}
})();
