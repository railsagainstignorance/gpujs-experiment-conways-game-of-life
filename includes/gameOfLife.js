const GOL = (function(){

  // naming convention:
  // - <verb>KFn => the function def which will be used to create a kernel
  // - <verb>K   => the kernel derived from the fn *KFn
  // - <verb>Kt  => the kernel derived from the fn *KFn, pipelining output to a texture (keeping data in GPU)
  // - <name>T   => a var referencin pipelined output

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

    const loadGridKFn = function(a) {
        return a[this.thread.x][this.thread.y];
    }

    const loadGridKt = gpu.createKernel(loadGridKFn)
    .setOutput([config.sizeX, config.sizeY])
    .setOutputToTexture(true)

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

    const tickKt = gpu.createKernel(tickKFn, {
      constants: {
        sizeX: config.sizeX,
        sizeY: config.sizeY,
      },
      output: [config.sizeX, config.sizeY],
      outputToTexture: true
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

    const randomArray = initRandomArray(config.sizeX, config.sizeY);
    var gridT = loadGridKt( randomArray );

    const maxTicks = 1000;
    var numTicks = 0;
    function animateTick(){
      gridT = tickKt( gridT );
      renderK( gridT );
       if (numTicks < maxTicks) {
         numTicks += 1;
         if (numTicks % 100 == 0) {
           console.log(`numTicks=${numTicks}`);
         }
         window.requestAnimationFrame(animateTick);
       }
     }

     window.requestAnimationFrame(animateTick);
  }

return {
  create
}
})();
