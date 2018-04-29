# Experimenting with GPU.js
## via Conway's Game of Life, hopefully getting to the chromatography project

## usage

Serve the static files as a web page, point your browser at localhost:YOURPORT, and watch something happen.

There is some output written to console, mainly for debugging/learning.

The default impl is of Conway's Game of Life, but you can switch over to the earlier, simple pattern experiment, by swapping over these two lines in index.html.

```javascript
// SIMPLEPATTERN.create({
GOL.create({
```

## context

Starting with http://gpu.rocks/, which purports to make is easier to write normal-ish javascript that maps cleanly to the GPU and hence runs significantly faster than if it stayed on the CPU.

## learnings

### using GPU.js

The [documentation](https://github.com/gpujs/gpu.js#table-of-contents) is ok, but not great. It is a good starting point, but has lots of gaps. The error messages can be less than useful.

My 'learnings' may also be misunderstandings. Caveat Emptor.

* worth noting for a kernel which outputs to a canvas, specified by `.setGraphical(true)`
   * does not return anything useful from the call to the kernel (see the docs)
   * when using `this.color(R,G,B,A)`, the RGBA values are floats in the range 0-1.
   * can create its own canvas element by default, or be given one via the initialisation of the gpu object
```javascript
     var gpu = new GPU({ canvas : document.getElementById('myCanvas') });
```
* you can only use a function instance once in a kernel. This is not an issue if you create anonymous functions dynamically in the kernel creation as per the docs, but if you assign a function instance to a variable, then use that value in two `gpu.createKernel` calls, it will complain.
* when creating a kernel, your function can't refer to variables that were defined outside the scope of that function. If you want to use externally-set values, you pass them into the kernel via the `constants` attribute (see the docs).
* by default, every invocation of a kernel involves porting the input array arguments from JS arrays into GPU-tastic datastructures (aka textures), running the kernel in the GPU to generate an GPU-specific output structure, then porting that structure back into normal JS, where you can then use it as per usual. This is fine if you only want to carry out one, isolated piece of heavy-duting processing on some data, but very inefficient if you want to iterate that. The key phrase to notice is *pipelining* (see the docs).
   * you can modify your kernel to keep the output data in the GPU as a texture, so you can then pass it as input to a subsequent kernel without it being ported back into and then out of JS along the way: `.setOutputToTexture(true)`.
   * it is worth noting that each kernel, when outputting to a texture in this way, only has its own, single texture instance, so you can't, for instance, like I did, simply pass the output of a kernel to be the input to the next iteration of the same kernel, because then you will find it is reading from the same structure it is writing to and, apologies for getting technical here, weird shit happens.
   * a simple solution to allow a kernel to safely read in its own output is to add an extra kernel step which creates a clone of that output, and pass that cloned output instance to the original kernel.
   * Pipelining is also the answer to the vexed question of how can I do lots of funky GPU-tastic processing *and* periodically display some graphical output via canvas without having to port back into JS and out again. Every so often, the output from the kernel (which is being called repeatedly) can be passed as input to a render kernel to update its canvas element, all staying in the GPU context.  
* the arrays you pass in to a kernel when invoking it can be normal JS arrays or special GPU-ified-texturey arrays, but presumably with a big performance hit if porting from JS.
   * one solution for getting data into a kernel which then is called repeatedly on the data (see pipelining, above), is to create a kernel whose sole purpose is to be called once, to upload the data from JS into a texture, and then pass that texture as the input to the original kernel.
   * presumably, you can do the same (by creating a dedicated kernel) to download the texture data into normal JS after the processing iterations are over.

#### questions

* Not clear what happens if a function which is used in the kernel creation is then invoked outside of the kernel context?
* No idea if/how you can specify multiple canvas instances in the same gpu instance?
* Given that the pipelining thing works, and you can sequence the kernel calls in normal JS whilst keeping the data in the GPU as textures, it is not clear why you would need to use the combineKernels and createKernelMap options?
* Not clear what happens in the kernel if this.thread.x goes out of bounds of the input array? Not good, probably.

### implementing Conway's Game Of Life

* Only an idiot would include the central cell in the count of neighbours, right?
