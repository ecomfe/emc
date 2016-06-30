let gulp = require('gulp');
let sourcemaps = require('gulp-sourcemaps');
let babel = require('gulp-babel');
let replace = require('gulp-replace');
let uglify = require('gulp-uglify');
let rename = require("gulp-rename");

gulp.task(
    'default',
    () => {
        gulp.src('src/Model.js')
            .pipe(replace('process.env.NODE_ENV', '"development"'))
            .pipe(sourcemaps.init())
            .pipe(babel())
            .pipe(sourcemaps.write('map'))
            .pipe(gulp.dest('.'));

        gulp.src('src/Model.js')
            .pipe(replace('process.env.NODE_ENV', '"production"'))
            .pipe(sourcemaps.init())
            .pipe(babel())
            .pipe(uglify())
            .pipe(rename({suffix: '.min'}))
            .pipe(sourcemaps.write('map'))
            .pipe(gulp.dest('.'));
    }
);
