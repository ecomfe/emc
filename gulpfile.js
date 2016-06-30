var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var replace = require('gulp-replace');
var uglify = require('gulp-uglify');
var rename = require("gulp-rename");
var merge = require('merge-stream');

gulp.task(
    'default',
    function () {
        var development = gulp.src('src/Model.js')
            .pipe(replace('process.env.NODE_ENV', '"development"'))
            .pipe(sourcemaps.init())
            .pipe(babel())
            .pipe(sourcemaps.write('map'))
            .pipe(gulp.dest('.'));

        var production = gulp.src('src/Model.js')
            .pipe(replace('process.env.NODE_ENV', '"production"'))
            .pipe(sourcemaps.init())
            .pipe(babel())
            .pipe(uglify())
            .pipe(rename({suffix: '.min'}))
            .pipe(sourcemaps.write('map'))
            .pipe(gulp.dest('.'));

        return merge(development, production);
    }
);
