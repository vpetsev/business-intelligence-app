import React, { Component } from 'react';
import Link from 'next/link';

class BlogSideBar extends Component {
    render() {
        return (
            <aside className="widget-area">
                <div className="widget widget_search">
                    <form className="search-form search-top">
                        <label>
                            <span className="screen-reader-text">Search for:</span>
                            <input type="search" className="search-field" placeholder="Search..." />
                        </label>

                        <button type="submit">
                            <i className="fas fa-search"></i>
                        </button>
                    </form>
                </div>

                <div className="widget widget_plamb_posts_thumb">
                    <h3 className="widget-title">Recent posts</h3>

                    <article className="item">
                        <Link href="#" className="thumb">

                                <span className="fullimage cover bg1" role="img"></span>

                        </Link>

                        <div className="info">
                            <time>February 10, 2020</time>
                            <h4 className="title usmall">
                                <Link href="#">
                                    Making peace with the feast or famine of freelancing
                                </Link>
                            </h4>
                        </div>
                    </article>

                    <article className="item">
                        <Link href="#" className="thumb">

                                <span className="fullimage cover bg2" role="img"></span>

                        </Link>

                        <div className="info">
                            <time>June 21, 2020</time>
                            <h4 className="title usmall">
                                <Link href="#">
                                    I used the web for a day on a 50 mb budget
                                </Link>
                            </h4>
                        </div>
                    </article>

                    <article className="item">
                        <Link href="#" className="thumb">

                                <span className="fullimage cover bg3" role="img"></span>

                        </Link>

                        <div className="info">
                            <time>June 30, 2020</time>
                            <h4 className="title usmall">
                                <Link href="#">
                                    How to create a responsive popup gallery?
                                </Link>
                            </h4>
                        </div>
                    </article>
                </div>

                <div className="widget widget_categories">
                    <h3 className="widget-title">Categories</h3>

                    <ul>
                        <li>
                            <Link href="#">
                                Business <span className="post-count">(2)</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="#">
                                Privacy <span className="post-count">(5)</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="#">
                                Technology <span className="post-count">(7)</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="#">
                                Tips <span className="post-count">(4)</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="#">
                                Uncategorized <span className="post-count">(5)</span>
                            </Link>
                        </li>
                    </ul>
                </div>

                <div className="widget widget_recent_comments">
                    <h3 className="widget-title">Recent comments</h3>

                    <ul>
                        <li>
                            <span className="comment-author-link">
                                <Link href="#">
                                    A React commenter
                                </Link>
                            </span>
                            on
                            <Link href="#">
                                Hello world!
                            </Link>
                        </li>
                        <li>
                            <span className="comment-author-link">
                                <Link href="#">
                                    Raxr
                                </Link>
                            </span>
                            on
                            <Link href="#">
                                Hello world!
                            </Link>
                        </li>
                        <li>
                            <span className="comment-author-link">
                                <Link href="#">
                                    React Next
                                </Link>
                            </span>
                            on
                            <Link href="#">
                                Hello world!
                            </Link>
                        </li>
                        <li>
                            <span className="comment-author-link">
                                <Link href="#">
                                    A React Next Commenter
                                </Link>
                            </span>
                            on
                            <Link href="#">
                                Hello world!
                            </Link>
                        </li>
                        <li>
                            <span className="comment-author-link">
                                <Link href="#">
                                    Raxr
                                </Link>
                            </span>
                            on
                            <Link href="#">
                                Hello world!
                            </Link>
                        </li>
                    </ul>
                </div>

                <div className="widget widget_tag_cloud">
                    <h3 className="widget-title">Tags</h3>

                    <div className="tagcloud section-bottom">
                        <Link href="#">

                                IT
                                <span className="tag-link-count"> (3)</span>

                        </Link>

                        <Link href="#">

                                Raxr
                                <span className="tag-link-count"> (3)</span>

                        </Link>

                        <Link href="#">

                                Games
                                <span className="tag-link-count"> (2)</span>

                        </Link>

                        <Link href="#">

                                Fashion
                                <span className="tag-link-count"> (2)</span>

                        </Link>

                        <Link href="#">

                                Travel
                                <span className="tag-link-count"> (1)</span>

                        </Link>

                        <Link href="#">

                                Smart
                                <span className="tag-link-count"> (1)</span>

                        </Link>

                        <Link href="#">

                                Marketing
                                <span className="tag-link-count"> (1)</span>

                        </Link>

                        <Link href="#">

                                Tips
                                <span className="tag-link-count"> (2)</span>

                        </Link>
                    </div>
                </div>
            </aside>
        );
    }
}

export default BlogSideBar;
