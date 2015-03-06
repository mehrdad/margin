var billion = 1000000000;
var million = 1000000;
// comments

var productTypeColors =
    ["#74C365", // light green 
    "#006600",  // dark green 
    "#007BA7"]; // blue

var parseDate = d3.time.format("%Y-%m-%d").parse;
var numberFormat = d3.format(",.0f");

d3.csv("data/margin-report.csv", function (data) {
    data.forEach(function (d) {
        d.date = parseDate(d.LockDate);
        d.amount = +d.UPB; // cast to numbers
        d.Nec = +d.Nec$;
        d.year = d.date.getFullYear();
        d.Nec_pct = (d.amount > 0) ? d.Nec/d.amount: 0;
        // total only products we are interested in
        d.total = (d.ProductCategory == "VA IRRRL" ) || (d.ProductCategory == "FHA Streamline") || (d.ProductCategory ==  "Conventional")   ? d.amount:0;
        
    });
    // put data in crossfilter
    var facts = crossfilter(data);
    

    // Convenient version using CrossFilter
    var totalGroup = facts.groupAll().reduceSum(dc.pluck("amount"));


    dc.numberDisplay("#dc-chart-total")
        .group(totalGroup)
        .valueAccessor(function(d){
            return d / million;
        })
        .transitionDuration(1000)
        .formatNumber(function(d){ return "$" + Math.round(d) + " Million"; });

    var productTypeDim = facts.dimension(dc.pluck('ProductCategory'));
    //var productTypeGroupSum = productTypeDim.group().reduceSum(dc.pluck("amount"));
    var productTypeGroupSum = productTypeDim.group().reduceSum(function(d) { return  d.amount / million; }); 
    
    //console.log("Let's Inspect our Group Sum: ", productTypeGroupSum.all() );
    var yearDim  = facts.dimension(function(d) {return +d.year;});
    var year_total = yearDim.group().reduceSum(function(d) {return  d.amount;});
   
    var yearRingChart   = dc.pieChart("#chart-ring-year");
    
    yearRingChart
    .width(150).height(150)
    .dimension(yearDim)
    .group(year_total)
    .innerRadius(30); 

    // dimension by month
    var monthlyDimension = facts.dimension(function (d) {
        
        var month = ["Jan","Feb","Mar","Aprl","May","June","July","Aug","Sep","Oct","November","December"]
        
        return month[d.date.getMonth()];
    });
    
    var monthlyGroupSum = monthlyDimension.group().reduceSum(function(d) { return numberFormat(d.amount/million);});
    
    var row_months = dc.rowChart("#dc-chart-months")
        .dimension(monthlyDimension)
        .group(monthlyGroupSum)
        .width(400)
        .height(150)
        .xAxis().tickFormat(function (v) {
            return v + "M";
        });
    

    // counts per weekday
    var dayOfWeek = facts.dimension(function (d) {
        var day = d.date.getDay();
        var name = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return day + '.' + name[day];
    });
    var dayOfWeekGroup = dayOfWeek.group();
    //#### Row Chart
    var dayOfWeekChart = dc.rowChart("#dc-day-of-week-chart");

    dayOfWeekChart.width(400)
        .height(180)
        .margins({top: 20, left: 10, right: 10, bottom: 20})
        .group(dayOfWeekGroup)
        .dimension(dayOfWeek)
        // assign colors to each value in the x scale domain
        .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
        .label(function (d) {
            return d.key.split('.')[1];
        })
        // title sets the row text
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().ticks(4);

    var row = dc.rowChart("#dc-chart-productType")
        .dimension(productTypeDim)
        .group(productTypeGroupSum)
        .width(300)
        .height(400)
       // .radius(80)
        .ordinalColors(productTypeColors);

    var dateDim = facts.dimension(dc.pluck('date'));
    var minDate = dateDim.bottom(1)[0].date;
    var maxDate = dateDim.top(1)[0].date;

    var dateGroupSum = dateDim.group().reduce(
        function(p,v){
            p[v.ProductCategory] += v.amount;
            return p;
        },
        function(p,v){
            p[v.ProductCategory] -= v.amount;
            return p;
        },
        function(){
            return { "VA IRRRL": 0, "FHA Streamline": 0, "Conventional": 0 };
        }
    ); 
    //console.log("Fiscal month Group Sum: ", monthGroupSum.all() );
    
    var va_IRRRL       = dateDim.group().reduceSum(function(d) { return  (d.ProductCategory == "VA IRRRL") ?  d.Nec_pct: 0; }); 
   /* var va_IRRRL = dateDim.group().reduce(
        function(p,v){
            if (v.ProductCategory == "VA IRRRL") {
              p[v.ProductCategory] += v.amount;
              p.pct = v.Nec_pct;
              p.date = v.date;
              p.upb += v.amount;
              }

            return p;
        },
        function(p,v){
           if (v.ProductCategory == "VA IRRRL") {
            p[v.ProductCategory] -= v.amount;
            p.pct = +v.Nec_pct;
            p.date = v.date;
            p.upb -= v.amount;
         }
            return p;
        },
        function(){
            return { "VA_IRRRL": 0, "FHA_Streamline": 0, "Conventional": 0, "pct": 0, "upb": 0, "date": 0 };
        }

);
*/
    var fha_streamline = dateDim.group().reduceSum(function(d) { return  (d.ProductCategory == "FHA Streamline") ? d.Nec_pct: 0; });
    var conventional   = dateDim.group().reduceSum(function(d) { return  (d.ProductCategory == "Conventional") ? d.Nec_pct: 0; });

    var yearDim  = facts.dimension(function(d) {return +d.year;});
    var year_total = yearDim.group().reduceSum(function(d) {return d.amount;});

    
       
  /*var bar = dc.barChart("#dc-chart-fiscalMonth")
        .dimension(dateDim)
        .group(va_IRRRL, "VA IRRRL")
        .stack(fha_streamline, "FHA Streamline")
        .stack(conventional, "Conventional")
        .width(650)
        .height(200).margins({ top: 10, right: 30, bottom: 20, left: 50 })
        .legend(dc.legend().x(60).y(20))
        .gap(10)
        .centerBar(true)
        .x(d3.time.scale().domain([minDate, maxDate]))
        //.filter([2015.1, 2015.5])
        .elasticY(true)
        .ordinalColors(productTypeColors);

    bar.yAxis().tickFormat(d3.format("d"));
    bar.yAxis().tickFormat(function(v){ return v  + " M"; });*/

  var line = dc.lineChart("#dc-chart-fiscalMonth")
   .width(800).height(400)
   .margins({ top: 10, right: 30, bottom: 20, left: 30 })
   .dimension(dateDim)
   .group(va_IRRRL, "VA IRRRL")
   .stack(fha_streamline, "FHA Streamline")
   .stack(conventional, "Conventional") 
   .renderArea(false)
   .x(d3.time.scale().domain([minDate,maxDate]))
   .brushOn(true)
   .legend(dc.legend().x(50).y(10).itemHeight(13).gap(5))
   .yAxisLabel("Margin")
   .ordinalColors(productTypeColors);
    line.yAxis().tickFormat(d3.format(""));
    line.yAxis().tickFormat(function(v){ return v  + "%"; });
    
    
        
    new RowChart(facts, "PortFlag", 300, 10);
    new RowChart(facts, "LoanPurpose", 300, 10);
    
    
    // Console Log your data to see what it looks like:
    console.log("Data Debug: ", data);
    
    // draw all dc charts. w/o this nothing happens!  
    dc.renderAll();
});



var RowChart = function(facts, attribute, width, maxItems){
    this.dim = facts.dimension(dc.pluck(attribute));
    dc.rowChart("#dc-chart-" + attribute)
        .dimension(this.dim)
        .group(this.dim.group().reduceSum(dc.pluck("amount")))
        .data(function(d){ return d.top(maxItems); })
        .width(width)
        .height(maxItems * 22)
        .margins({ top: 0, right: 10, bottom: 20, left: 20 })
        .elasticX(true)
        .ordinalColors(['#9ecae1'])
        .labelOffsetX(5)
        .xAxis().ticks(4).tickFormat(d3.format(".2s"));
};




