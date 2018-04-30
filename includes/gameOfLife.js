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

    function initEmptyArray(maxX,maxY){
      const a = [];
      for (var y = 0; y < maxY; y++) {
        a.push([]);
        for (var x = 0; x < maxX; x++) {
          a[y].push(0);
        }
      }
      return a;
    }

    function initPatternArray(maxX,maxY, pattern){
      const a = initEmptyArray(maxX,maxY);
      const centreX = parseInt(maxX/2);
      const centreY = parseInt(maxY/2);

      pattern.map( function(row, dy){
        row.map( function(cell, dx){
          a[centreY+dy][centreX+dx] = cell;
        });
      });
      return a;
    }

    const loadGridKFn = function(a) {
        return a[this.thread.x][this.thread.y];
    }

    const loadGridKt = gpu.createKernel(loadGridKFn)
    .setOutput([config.sizeX, config.sizeY])
    .setOutputToTexture(true)

    const subTickKFn = function(grid) {
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

      const cell = grid[this.thread.x][this.thread.y];
      sum = sum - cell; // because this cell has been counted in the nhr for loops

      var outputCell;
      if( (sum === 3) || ((sum === 2) && (cell === 1) ) ) {
        outputCell = 1;
      } else {
        outputCell = 0;
      }
      return outputCell;
    }

    const subTickKt = gpu.createKernel(subTickKFn, {
      constants: {
        sizeX: config.sizeX,
        sizeY: config.sizeY,
      },
      output: [config.sizeX, config.sizeY],
      outputToTexture: true
    });

    const cloneGridKFn = function(a) {
        return a[this.thread.x][this.thread.y];
    }

    const cloneGridKt = gpu.createKernel(cloneGridKFn, {
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

    // const initialArray = initRandomArray(config.sizeX, config.sizeY);

    const initialArray = initPatternArray(config.sizeX, config.sizeY, [
      [0,1,1],
      [1,1,0],
      [0,1,0],
    ])

    // const initialArray = initPatternArray(config.sizeX, config.sizeY, [
    //   [0,1],
    //   [0,0,0,1],
    //   [1,1,0,0,1,1,1],
    // ])

    var gridT = loadGridKt( initialArray );

    var fromMillis = Date.now();
    const maxTicks = 1000;
    const everyFewTicks = 100;
    const maxSubTicks = 13; // multiple of glider period (i.e. 4) + 1
    var numTicks = 0;
    var sumRafDelaysMillis = 0;
    var fromRafMillis = fromMillis;
    var sumSubTicksMillis = 0;
    var sumRenderMillis = 0;
    const commentaryEntries = [];

    function animateTick(){
      const animateTickStartMillis = Date.now();
      sumRafDelaysMillis += (animateTickStartMillis - fromRafMillis);
      var subTicks = 0;
      while( subTicks < maxSubTicks ){
        const tempGridT = subTickKt( gridT );
        gridT = cloneGridKt( tempGridT );
        subTicks++;
      }
      const subTicksEndMillis = Date.now();
      sumSubTicksMillis += (subTicksEndMillis - animateTickStartMillis);
      renderK( gridT );
      sumRenderMillis += (Date.now() - subTicksEndMillis);
      if (numTicks < maxTicks) {
        numTicks += 1;
        if (numTicks % everyFewTicks == 0) {
          const nowMillis = Date.now();
          const durationMillis = nowMillis - fromMillis;
          const tickRate = 1000 * everyFewTicks / durationMillis;
          const subTickRate = tickRate * maxSubTicks;
          commentaryEntries.unshift(`numTicks=${numTicks}, durationMillis=${durationMillis} (of which, RAF=${sumRafDelaysMillis}, subTicks=${sumSubTicksMillis}, render=${sumRenderMillis}), frameRate=${parseFloat(tickRate).toFixed(1)}, subTickRate=${parseFloat(subTickRate).toFixed(1)}, subTicksPerFrame=${maxSubTicks}`);
          const commentary = commentaryEntries.join("\n<br>");
          console.log(commentary);
          if (config.hasOwnProperty( 'writeRunningCommentaryInnerHTML')) {
            config.writeRunningCommentaryInnerHTML( commentary );
          }
          fromMillis = nowMillis;
          sumRafDelaysMillis = 0;
          sumSubTicksMillis = 0;
          sumRenderMillis = 0;
        }

        fromRafMillis = Date.now();
        window.requestAnimationFrame(animateTick);
      }
    }

    window.requestAnimationFrame(animateTick);
  }

return {
  create
}
})();
