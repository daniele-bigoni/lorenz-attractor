requirejs(["Quaternion"], function (Quaternion) {
  $(function () {
      // integrates the lorentz equations and displays the result in a nice
      // flot graph with sliders.
      //
      // graphing: http://www.flotcharts.org/
      // sliders: http://jqueryui.com/
      // the maths: http://en.wikipedia.org/wiki/Lorenz_system

      var sigma = 10.0;
      var rho = 28.0;
      var beta = 2.66;

      // maxiumum number of points in the series.
      var totalPoints = 100;
      // length of the axes on the graph.
      var axisLength = 3;
      // total rotation quaternion
      var rotation = new Quaternion(1, 0, 0, 0);
      // rotation during this mouse drag
      var dragRot = new Quaternion(1, 0, 0, 0);
      // current total rotation (from both above)
      var curRot = new Quaternion(1, 0, 0, 0);
      // number of drag pixels per full rotation
      var dragScale = 500;
      // original x, y, z axes of the plot, in screen coords
      var origAxes = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
      // current x, y, z axes after rotation, in screen coords.
      // need to define twice or do a deep copy.
      var axes = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
        ];

      // parameter values to use in equation.
      var parmVals = {};
      // the number of data series.
      var numSeries = 30;
      // the array of raw data for all the plot series
      var data = [];
      for (var series = 0; series < numSeries; series++) {
        data.push([])
      }

      // default values of parameters etc.
      var dt = 0.01;
      var initialPoints = [[]];
      var iters = 5; // number of iterations per refresh
      var updateInterval = 50; // time in ms per refresh
      var plot; // object to store the flot plot in.

      // scale of the plot (0-10);
      var scale = 1.5;

      var vary = 22.0;
      var spread = 200.0;

      var switchFrequency = 0.2

      function getInitialPoints(random) {
        // get some random starting points.
        var centrePoint = [];

        for (var series = 0; series < numSeries; series++) {
          if (random || initialPoints[series] === undefined) {
            initialPoints[series] = [];
            for (var axis = 0; axis < 3; axis++) {
              initialPoints[series][axis] = 2 * Math.random() * vary - vary;
            }
          }
        }
        
        // for (var axis = 0; axis < 3; axis++) {
        //   centrePoint[axis] = 0.1 +
        //     2 * Math.random() * vary - vary;
        // }
        // for (var series = 0; series < numSeries; series++) {
        //   if (random || initialPoints[series] === undefined) {
        //     initialPoints[series] = [];
        //     for (var axis = 0; axis < 3; axis++) {
        //       initialPoints[series][axis] = centrePoint[axis] +
        //         2 * Math.random() * spread - spread;
        //     }
        //   }
        // }
      }

      function addDataPoint(series) {
        // use current time to switch on/off the diffusion coefficient
        var t = Date.now() / 1000
        var eta = (Math.sin(t * switchFrequency) + 1) / 2 
        // add a new data point to data[series].
        if (data[series] === undefined) {
          data[series] = [];
        }
        var sData = data[series];
        var prev = sData.length !== 0 ? sData[sData.length - 1] : initialPoints[series];
        if (sData.length >= totalPoints ) {
          // remove first point.
          sData = sData.slice(1);
        }
        var next = [
          // integrate the lorenz equations.
          prev[0] + (1-eta) * dt * (sigma * (prev[1] - prev[0])) + dt * eta * (Math.random() - 0.5) * spread,
          prev[1] + (1-eta) * dt * (prev[0] * (rho - prev[2]) - prev[1]) + dt * eta * (Math.random() - 0.5) * spread,
          prev[2] + (1-eta) * dt * (prev[0] * prev[1] - beta * prev[2]) + dt * eta * (Math.random() - 0.5) * spread
          ];
        sData.push(next);
        data[series] = sData;
      }

      function addAllDataPoints() {
        for (var series = 0; series < numSeries; series++) {
          addDataPoint(series);
        }
      }

      function getSeries(series, axes) {
        // return a data series as an object with formatting parameters.
        return {
          color: "rgba(255, 128, 32, 0.5)",
          lines: {lineWidth: 1},
          data: project(data[series], axes)
        }
      }

      function getAllSeries(axes) {
        // get all data series plus the axes.
        var ret=[];
        for (var series = 0; series < numSeries; series++) {
          ret.push(getSeries(series, axes));
        }
        return ret;
      }

      function resetAxes() {
        // deep copy origAxes into axes.
        axes = [];
        for (var i = 0; i < 3; i++) {
            axes[i] = [];
          for (var j = 0; j < 3; j++) {
            axes[i][j] = origAxes[i][j];
          }
        }
        rotation.setValues(1, 0, 0, 0);
      }

      function rotatePoint(point, rot) {
        // rotate a 3D point by the quaternion curRot
        var conj = rot.conjugate();
        var pointQuat = new Quaternion().setPoint(point);
        var newPoint = rot.multiply(
            pointQuat.multiply(conj)).getPoint();
        return newPoint;
      }

      function projectPoint(point, axes) {
        // project a point using the rotated axes 'axes'
        var newPoint = [];
        for (var i = 0; i < 2; i++) {
          newPoint[i] = 0;
          for (var j = 0; j < 3; j++) {
            newPoint[i] += point[j] * axes[j][i];
          }
        }
        return newPoint;
      }

      function project(data, axes) {
        // return a 2D projected version of the data.
        var ret = [];
        var point;
        for (var i = 0; i < data.length; i++) {
          point = data[i];
          point = projectPoint(point, axes);
          ret.push(point);
        }
        return ret;
      }

      function makePlot() {
        // set up the plot
        var xscale = 50 * scale;
        var yscale = xscale * $("#chart").height() / $("#chart").width();
        var options = {
            series: { shadowSize: 0 }, // drawing is faster without shadows
            yaxis: { min: -yscale, max: yscale, show: false },
            xaxis: { min: -xscale, max: xscale, show: false },
            grid: {show: false}
        };
        plot = $.plot($("#chart"), getAllSeries(axes), options);
      }

      // get an initial data point.
      getInitialPoints(true);
     
      // make the initial plot.
      makePlot();

      function update() {
        // do the animation loop.
        for (var i = 0; i < iters; i++) {
          // do iters iterations of the lorenz equations.
          addAllDataPoints();
        }
        // // Axis rotation
        // // use current time to do axis rotation
        // var t = Date.now() / 1000
        // var theta = t / 2
        // var cs = Math.cos(theta / 2)
        // var sn = Math.sin(theta / 2)
        // curRot.setValues(cs, 0.33 * sn, 0.33 * sn, 0.33 * sn)
        // for (var i = 0; i < 3; i++) {
        //   // rotate the axes.
        //   axes[i] = rotatePoint(origAxes[i], curRot);
        // }


        // if (dragging && dragOrigin !== null) {
        //   // the mouse is being dragged.
        //   var angle, axis;
        //   if (shifty) {
        //     axis = [0, 0, 1];
        //     angle = dragPos.x;
        //   } else {
        //     var dragDist = Math.sqrt(
        //       dragPos.x * dragPos.x +
        //       dragPos.y * dragPos.y
        //     );
        //     if (dragDist > 0) {
        //       axis = [dragPos.y / dragDist, dragPos.x / dragDist, 0];
        //     } else {
        //       axis = [0, 1, 0, 0];
        //     }
        //     angle = dragDist;
        //   }
        //   angle *= 2 * Math.PI / dragScale;
        //   dragRot.setAxisAngle(axis, angle);
        //   curRot = dragRot.multiply(rotation);
        //   for (var i = 0; i < 3; i++) {
        //     // rotate the axes.
        //     axes[i] = rotatePoint(origAxes[i], curRot);
        //   }
        // }
        plot.setData(getAllSeries(axes));
        plot.draw();
        setTimeout(update, updateInterval);
      }

      update();
    });
});
